# 🧠 MindBattle - Quiz Competition Platform

A comprehensive quiz competition platform featuring KBC-style and Fastest Finger quiz formats with real-time leaderboards, wallet management, and admin controls.

## 🏗️ Project Structure

```
/app/
├── components/          # React components (UI screens)
├── services/           # API and business logic services
├── backend/            # Node.js + Express + PostgreSQL server
│   ├── server.js       # Main backend server
│   ├── db.js          # Database connection
│   ├── database.sql   # PostgreSQL schema
│   └── package.json   # Backend dependencies
├── types.ts           # TypeScript type definitions
├── App.tsx            # Main React application
├── vercel.json        # Vercel deployment config
└── package.json       # Frontend dependencies
```

## 🚀 Features

- **Dual Quiz Formats**: KBC-style and Fastest Finger competitions
- **User Management**: Registration, login, wallet system
- **Admin Panel**: Contest creation, user management, financial controls
- **Real-time Leaderboards**: Track rankings and performance
- **Wallet System**: Deposits, withdrawals, prize money
- **AI Integration**: Gemini AI for question generation
- **Responsive Design**: Works on desktop and mobile

## 🛠️ Tech Stack

**Frontend:**
- React 19
- TypeScript
- Vite
- Tailwind CSS (via inline styles)

**Backend:**
- Node.js
- Express
- PostgreSQL
- pg (node-postgres)

**Deployment:**
- Frontend: Vercel
- Backend: Render
- Database: Render PostgreSQL

## 📦 Installation & Local Development

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/mindbattle_db
   NODE_ENV=development
   ```

4. Setup PostgreSQL database:
   ```bash
   createdb mindbattle_db
   psql -d mindbattle_db -f database.sql
   ```

5. Start backend server:
   ```bash
   npm run dev
   ```
   Server runs on http://localhost:3001

### Frontend Setup

1. Install dependencies (from root directory):
   ```bash
   npm install
   ```

2. Update API endpoint (for local dev):
   - Edit `vercel.json` to point to `http://localhost:3001`

3. Start frontend:
   ```bash
   npm run dev
   ```
   Frontend runs on http://localhost:5173

## 🌐 Deployment

Ready to deploy to production? See our comprehensive guides:

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Detailed deployment instructions
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist

**Quick Deploy:**
1. Backend → Render (with PostgreSQL)
2. Frontend → Vercel
3. Update `vercel.json` with your backend URL

## 🗄️ Database Schema

### Tables
- **users** - User accounts, wallet balances, contest history
- **contests_kbc** - KBC format contests
- **contests_fastest_finger** - Fastest Finger format contests
- **audit_logs** - Admin action tracking

See `backend/database.sql` for full schema.

## 🔐 Default Credentials

**Admin Login:**
- Email: `admin@mindbattle.com`
- Password: `admin123`

⚠️ **IMPORTANT**: Change these credentials immediately after deployment!

## 🧪 Testing

### Test Backend
```bash
# Health check
curl http://localhost:3001/

# Get contests
curl http://localhost:3001/contests
```

### Test Frontend
Open browser to `http://localhost:5173` and test:
- View contests
- Login/Register
- Admin panel
- Quiz gameplay

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/contests` | GET | Get all contests |
| `/diagnostics` | GET | View last 20 requests |

(More endpoints available in the application)

## 🐛 Common Issues

### Backend won't start
- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Check port 3001 is not in use

### Frontend can't connect to backend
- Verify backend is running
- Check vercel.json proxy configuration
- Check browser console for CORS errors

### Database errors
- Ensure database.sql was run
- Check PostgreSQL connection
- Verify database name matches .env

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is private/proprietary.

## 🔗 Links

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 📧 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for quiz enthusiasts worldwide**
