//! Custom DNS over HTTPS (DoH) resolver configuration for use in AWS Nitro Enclaves.
//!
//! This module provides a custom DoH resolver that uses hostname-based connections
//! instead of direct IP addresses. This is necessary because:
//!
//! 1. AWS Nitro Enclaves have no direct internet access
//! 2. All traffic must go through the traffic forwarder (traffic_forwarder.py)
//! 3. hickory-resolver's `google_https()` uses hardcoded IPs (8.8.8.8, 8.8.4.4) which bypass the forwarder
//!
//! Our solution: Resolve the hostname `dns.google` to an IP address using the system resolver.
//! The system resolver will check `/etc/hosts` first (if configured in the enclave), then fall back
//! to DNS. This ensures we connect via hostname resolution rather than hardcoded IPs, allowing
//! the traffic forwarder to intercept connections when `/etc/hosts` maps `dns.google` to a local
//! address (e.g., 127.0.0.65).

#[cfg(all(feature = "mail-auth", feature = "hickory-resolver"))]
use hickory_resolver::config::{NameServerConfig, NameServerConfigGroup, Protocol, ResolverConfig};
use std::net::ToSocketAddrs;
#[cfg(all(feature = "mail-auth", feature = "hickory-resolver"))]
use tracing::info;

/// Creates a custom DoH resolver configuration that uses hostname-based routing.
///
/// This resolver resolves `dns.google:443` to an IP address using the system resolver.
/// The system resolver checks `/etc/hosts` first (if configured), then falls back to DNS.
/// This ensures we connect via hostname resolution rather than hardcoded IPs like `8.8.8.8` or `8.8.4.4`.
///
/// # Network Flow (in enclave with /etc/hosts configured)
///
/// ```
/// Enclave: Resolve dns.google → 127.0.0.65 (via /etc/hosts)
///   ↓ Connect to 127.0.0.65:443
///   ↓ (traffic_forwarder.py)
/// VSOCK 8102
///   ↓ (vsock-proxy on parent EC2)
/// dns.google:443 (resolved by parent EC2)
/// ```
///
/// # Network Flow (outside enclave or without /etc/hosts)
///
/// ```
/// Resolve dns.google → Google's actual IP (8.8.8.8, 8.8.4.4, etc.)
///   ↓ Connect directly to Google's DoH endpoint
/// ```
///
/// # TLS Certificate Validation
///
/// The resolver uses `tls_dns_name: "dns.google"` for TLS Server Name Indication (SNI),
/// which ensures the TLS certificate is validated against the hostname `dns.google` rather
/// than the IP address. The `webpki-roots` feature provides root CA certificates for
/// proper certificate validation.
///
/// # Returns
///
/// A `ResolverConfig` configured for DNS over HTTPS using Google's DoH endpoint.
/// The hostname `dns.google` is resolved to get the IP address, allowing the system
/// resolver to handle routing (via `/etc/hosts` in enclaves or DNS elsewhere).
#[cfg(all(feature = "mail-auth", feature = "hickory-resolver"))]
pub fn create_doh_resolver_config() -> ResolverConfig {
    // Resolve dns.google:443 to get the IP address using the system resolver
    // The system resolver will:
    // 1. Check /etc/hosts first (if configured, e.g., in enclave: dns.google → 127.0.0.65)
    // 2. Fall back to DNS resolution (returns Google's actual IPs: 8.8.8.8, 8.8.4.4, etc.)
    // This approach uses hostname resolution instead of hardcoded IPs, allowing the
    // traffic forwarder to intercept connections when /etc/hosts is configured.
    let hostname = "dns.google";
    let port = 443;
    
    // Resolve hostname with better error handling for enclave environments
    // In enclaves, /etc/hosts must be configured to map dns.google to 127.0.0.65 (or similar)
    info!("Resolving hostname '{}:{}' for DoH resolver...", hostname, port);
    let socket_addr = format!("{}:{}", hostname, port)
        .to_socket_addrs()
        .map_err(|e| {
            format!(
                "Failed to resolve {}: {}. In enclave environments, ensure /etc/hosts is configured to map {} to 127.0.0.65 (or the traffic forwarder address).",
                hostname, e, hostname
            )
        })
        .and_then(|mut addrs| {
            addrs.next().ok_or_else(|| {
                format!(
                    "No addresses found for {}. Check /etc/hosts configuration in the enclave.",
                    hostname
                )
            })
        })
        .expect("DNS resolver configuration failed");
    
    // Log the resolved IP address to help with debugging
    let resolved_ip = socket_addr.ip();
    let is_local = resolved_ip.is_loopback() || 
                   match resolved_ip {
                       std::net::IpAddr::V4(ipv4) => ipv4.is_private() || ipv4.is_link_local(),
                       std::net::IpAddr::V6(ipv6) => ipv6.is_loopback() || ipv6.is_unique_local(),
                   };
    
    if is_local {
        info!(
            "✓ Resolved '{}:{}' → {} (localhost/private IP - likely from /etc/hosts, enclave mode)",
            hostname, port, resolved_ip
        );
    } else {
        info!(
            "✓ Resolved '{}:{}' → {} (public IP - from DNS resolution, direct connection)",
            hostname, port, resolved_ip
        );
    }
    
    // Create a NameServerConfig for DoH
    // - socket_addr: The resolved IP address (from hostname resolution above)
    // - tls_dns_name: Used for TLS SNI (Server Name Indication) - must match the certificate
    // - tls_config: Required when using dns-over-https-rustls feature (provided by webpki-roots)
    let name_server = NameServerConfig::new(
        socket_addr,
        Protocol::Https,
    );
    // Override defaults for DoH
    let name_server = NameServerConfig {
        socket_addr: name_server.socket_addr,
        protocol: name_server.protocol,
        tls_dns_name: Some("dns.google".to_string()), // Used for TLS SNI
        trust_negative_responses: false,
        tls_config: name_server.tls_config, // Preserve from new() (None when feature enabled)
        bind_addr: name_server.bind_addr,
    };
    
    // Create a NameServerConfigGroup with our custom name server
    let mut name_servers = NameServerConfigGroup::new();
    name_servers.push(name_server);
    
    // Create ResolverConfig with our custom name servers
    ResolverConfig::from_parts(None, vec![], name_servers)
}

/// Creates a custom DoH resolver configuration (fallback for when features are disabled).
#[cfg(not(all(feature = "mail-auth", feature = "hickory-resolver")))]
pub fn create_doh_resolver_config() -> ResolverConfig {
    // Fallback: return default config (shouldn't be used if features are properly enabled)
    ResolverConfig::new()
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    #[cfg(all(feature = "mail-auth", feature = "hickory-resolver"))]
    fn test_custom_resolver_uses_hostname() {
        let config = create_doh_resolver_config();
        
        // Verify the resolver uses dns.google hostname (resolved to IP)
        let name_servers: Vec<_> = config.name_servers().iter().collect();
        assert!(!name_servers.is_empty(), "Resolver should have at least one name server");
        
        let name_server = &name_servers[0];
        // The IP will be whatever dns.google resolves to:
        // - In enclave with /etc/hosts: 127.0.0.65 (or whatever is configured)
        // - Outside enclave or without /etc/hosts: Google's actual IPs (8.8.8.8, 8.8.4.4, etc.)
        assert_eq!(name_server.socket_addr.port(), 443);
        assert_eq!(name_server.protocol, Protocol::Https);
        assert_eq!(name_server.tls_dns_name.as_ref().unwrap(), "dns.google");
    }
}

