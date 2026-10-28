# MediFlow Pharmacy

A full-stack online pharmacy platform built to manage medicine browsing, shopping carts, wishlists, checkout, and order tracking.

## Features
- Medicine catalog, search, and categories
- User authentication
- Shopping cart and wishlist
- Checkout and order management
- PostgreSQL database integration
- n8n workflow automation for order notifications and low-stock alerts
- Email notifications through Gmail

## Tech Stack
- Angular and TypeScript
- Node.js and Express.js
- PostgreSQL
- n8n
- Gmail SMTP

## Architecture
Angular Frontend → Node.js/Express REST API → PostgreSQL

The backend can trigger n8n workflows to automate order notifications and inventory alerts.

## Local Setup
1. Clone the repository.
2. Install frontend dependencies.
3. Install backend dependencies.
4. Configure the required environment variables using the provided `.env.example`.
5. Initialize the database using the project's documented database setup scripts.
6. Start the backend and frontend using the project scripts.

## Environment Variables
Configure database credentials, authentication secrets, email settings, and n8n webhook URLs in the local environment. Never commit `.env` files or credentials.

## Testing
Test authentication, medicine browsing, cart, wishlist, checkout, order history, order notifications, and low-stock alerts.

## Automation
- Order Notification: Backend → n8n Webhook → Edit Fields → Gmail
- Low Stock Alert: Backend → n8n Webhook → Edit Fields → IF → Gmail

## Security
Do not commit API keys, passwords, SMTP credentials, tokens, or production secrets.
