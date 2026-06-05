// server.js
const path = require('path');

// Hostinger / Passenger passes the socket or port in process.env.PORT
process.env.PORT = process.env.PORT || 3000;

// Require the Next.js standalone production server
require('./.next/standalone/server.js');
