# Gamefolio - Gaming Social Platform

Instagram-style social gaming platform where users can create profiles to showcase gaming clips, reels, and screenshots. The platform includes email verification, video upload with FFmpeg processing, profile customization with colors and banners, social features (likes, comments, follows), admin dashboard, Google authentication, and a YouTube Shorts-style trending page.

## Features

- **User Authentication**: Local registration and Google OAuth with Firebase
- **Content Sharing**: Upload gaming clips, screenshots, and reels
- **Social Features**: Follow users, like content, comment, and react with emojis
- **Profile Customization**: Custom banners, avatars, themes, and bio
- **Video Processing**: FFmpeg integration for video optimization and thumbnails
- **Real-time Features**: Live notifications and messaging system
- **Admin Dashboard**: User management and platform oversight
- **Email System**: Verification, password reset, and welcome emails via Brevo
- **Search & Discovery**: Hashtag-based search, trending content, game exploration

## Tech Stack

- **Frontend**: React.js, TypeScript, Tailwind CSS, Wouter (routing)
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Auth, Passport.js sessions
- **File Processing**: FFmpeg (video), Sharp (images), Multer (uploads)
- **Email**: Brevo API for transactional emails
- **Styling**: Tailwind CSS with custom dark theme

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Firebase project (for Google authentication)
- Brevo account (for email services)

### Environment Variables

Create a `.env` file with:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/gamefolio

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id

# Email Service
BREVO_API_KEY=your_brevo_api_key

# Gaming APIs
RAWG_API_KEY=your_rawg_api_key
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# Session Secret
SESSION_SECRET=your_secure_session_secret
```

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up the database: `npm run db:push`
4. Start the development server: `npm run dev`

The application will be available at `http://localhost:5000`

## Legal Documents

This repository includes comprehensive legal documentation:

- **[Terms of Service](./TERMS_OF_SERVICE.md)** - User terms and conditions
- **[Privacy Policy](./PRIVACY_POLICY.md)** - Data collection and privacy practices

These documents are also available as formatted pages within the application:
- `/terms` - Terms and Conditions page
- `/privacy` - Privacy Policy page  
- `/contact` - Contact and support information

## API Routes

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset completion

### Content Management
- `GET /api/clips` - Fetch user clips
- `POST /api/clips` - Upload new clip
- `GET /api/screenshots` - Fetch screenshots
- `POST /api/screenshots` - Upload screenshot

### Social Features
- `POST /api/clips/:id/like` - Like/unlike content
- `POST /api/clips/:id/comments` - Add comment
- `POST /api/users/:id/follow` - Follow/unfollow user

### User Management
- `GET /api/user` - Get current user
- `PUT /api/user` - Update user profile
- `GET /api/users/:username` - Get user profile

## Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts and profiles
- `clips` - Video content and metadata
- `screenshots` - Image content
- `games` - Game information and categories
- `likes` - Content likes and reactions
- `comments` - User comments on content
- `follows` - User follow relationships
- `notifications` - System notifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or support:
- Email: support@gamefolio.com
- Website: www.gamefolio.com
- Legal: legal@gamefolio.com
- Privacy: privacy@gamefolio.com

## Security

To report security vulnerabilities, please email security@gamefolio.com instead of using the public issue tracker.