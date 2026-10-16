# Masala Lane frontend

## Run locally

1. Install Node.js 18+.
2. From this folder run `npm install`.
3. Start the Spring Boot backend on `http://localhost:8080` (see the backend README).
4. Run `npm run dev` and open the Vite URL printed in the terminal (normally `http://localhost:5173`).

## Backend URL

By default, the app calls `http://localhost:8080`. For a deployed backend, create a `.env` file in this folder with:

```env
VITE_API_BASE_URL=https://your-backend-domain.example
```

Restart Vite after changing the value. Do not include a trailing slash unless your deployment requires it.

## Connected API features

- Categories: `GET /api/categories`
- Restaurant list and category filtering: `GET /api/restaurants`
- Offers: `GET /api/restaurants/offers`
- Restaurant menu: `GET /api/restaurants/{id}/menu`
- Food search: `GET /api/search?q=...`
- Registration: `POST /user/register`
- Login: `POST /api/auth/login`
- Authenticated cart and orders: `GET /api/cart`, `GET /api/orders`

The Axios client adds `Authorization: Bearer <token>` automatically when a token is stored after login/registration.
