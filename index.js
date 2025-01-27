const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors());

// Proxy middleware
app.use('/', (req, res, next) => {
    const targetUrl = req.query.url;
    
    // Validate URL
    if (!targetUrl) return res.status(400).send('URL parameter required');
    if (!/^https?:\/\//i.test(targetUrl)) return res.status(400).send('Invalid protocol');
    
    // Block sensitive domains
    const blockedDomains = ['localhost', '127.0.0.1', '::1', 'internal.api'];
    const hostname = new URL(targetUrl).hostname;
    if (blockedDomains.includes(hostname)) {
        return res.status(403).send('Blocked domain');
    }

    // Create the proxy middleware for the target URL
    createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true, // Change the origin to the target URL
        secure: false, // Allow self-signed certificates
        pathRewrite: (path) => '', // Remove the proxy path
        onProxyReq: (proxyReq, req) => {
            // Add headers if needed
            proxyReq.setHeader('X-Forwarded-For', req.ip);
        },
        onError: (err, req, res) => {
            console.error('Proxy error:', err);
            res.status(500).send('Proxy error');
        },
    })(req, res, next);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});

// Export for Vercel
module.exports = app;
