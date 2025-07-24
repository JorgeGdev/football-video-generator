# ⚽ Football Video Generator

> Automated sports video generation system with AI and virtual presenters

[![Live Demo](https://img.shields.io/badge/🌍_Live_Demo-Available-success?style=for-the-badge)](https://football-video-generator-production.up.railway.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/JorgeGdev/football-video-generator)
[![Railway](https://img.shields.io/badge/⚡_Deployed_on-Railway-blueviolet?style=for-the-badge)](https://railway.app)

---

## 🚀 Description

**Football Video Generator** is a complete automation system that generates professional sports videos using artificial intelligence. It combines news scraping, AI processing, voice synthesis, and video generation with realistic virtual presenters.

### ✨ Key Features

- 🤖 **Automatic generation** with OpenAI GPT-4 + RAG
- 🎭 **9 virtual presenters** (Sofia 1-9) with Hedra AI
- 🔊 **Latin voice synthesis** with ElevenLabs
- 🔒 **JWT authentication** with user roles
- 👑 **Complete admin panel**
- 📱 **Integrated Telegram bot**
- 📊 **Real-time dashboard** with logs
- 📥 **Video download system**
- 🌍 **RAG with 4 countries** (Italy, England, Spain, France)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    🌐 Frontend (Dashboard)                   │
│                 HTML5 + CSS3 + JavaScript                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                 ⚡ Backend (Node.js + Express)              │
│     ┌─────────────────────────────────────────────────┐     │
│     │  🔐 Auth System  │  📰 Scraper  │  🎬 Video Gen  │     │
│     └─────────────────────────────────────────────────┘     │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                    🤖 AI/API Integrations                   │
│  OpenAI │ ElevenLabs │ Hedra │ Supabase │ Telegram Bot      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js** - Web server
- **JWT** + **bcrypt** - Authentication and security
- **Server-Sent Events** - Real-time logs

### Frontend  
- **HTML5** + **CSS3** + **Vanilla JavaScript**
- **Responsive dashboard** with glassmorphism design
- **Real-time updates** via SSE

### AI & APIs
- **OpenAI GPT-4** - Sports script generation
- **ElevenLabs** - Voice synthesis (Nathalia - Latin voice)
- **Hedra AI** - Video generation with presenters
- **Supabase** - Database and RAG system
- **Telegram Bot API** - Automation

### Deploy & DevOps
- **Railway** - Deployment and hosting
- **GitHub** - Version control
- **Environment Variables** - Secure configuration

---

## 🚀 Live Demo

🌍 **[View Live Demo](https://football-video-generator-production.up.railway.app)**

**Test credentials:**
- Username: `demo`
- Password: `demo123`

---

## 📱 Features

### 🔐 Authentication System
- Secure login with JWT tokens
- User roles (Admin/User)
- Admin panel for user management
- Persistent sessions with cookies

### 📰 Automatic Scraping
- Sports news scraping from 4 countries (Italy, England, Spain, France)
- RAG (Retrieval-Augmented Generation) system
- Vector database in Supabase
- Automatic content updates

### 🎬 Video Generation
- **Smart scripts** with optimized GPT-4
- **9 virtual presenters** available
- **Realistic voice synthesis** in Spanish
- **HD videos** in 9:16 format (vertical)
- **Manual approval system**

### 📱 Telegram Bot
- Automatic generation via commands
- Format: `sofia3@Barcelona news`
- Integrated approval system
- Real-time notifications

### 📊 Control Dashboard
- **Real-time statistics**
- **System logs** with Server-Sent Events
- **Process control** (scraper, bot)
- **Video management** with download

---

## 🔧 Local Installation

### Prerequisites
- Node.js 18+
- Git
- Accounts in: OpenAI, ElevenLabs, Hedra, Supabase

### 1. Clone repository
```bash
git clone https://github.com/JorgeGdev/football-video-generator.git
cd football-video-generator
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
# Create .env file
cp .env.example .env

# Edit with your API keys
nano .env
```

### 4. Configure admin user
```bash
# Generate password hash
node generate-hash.js

# Update users.json with generated hash
```

### 5. Run application
```bash
npm start
```

### 6. Access dashboard
```
http://localhost:3000
```

---

## 🔑 Environment Variables

```env
# Telegram
BOT_TOKEN=your_bot_token
CHAT_ID=your_chat_id

# Supabase  
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=your_voice_id

# Hedra
HEDRA_API_KEY=your_hedra_key

# Authentication
JWT_SECRET=your_super_secure_jwt_secret

# Server
PORT=3000
NODE_ENV=production
```

---

## 📁 Project Structure

```
football-video-generator/
├── 📄 server.js              # Main server
├── 📁 modules/               # System modules
│   ├── 🔐 auth-manager.js    # Authentication system
│   ├── 📰 script-generator.js # AI script generation
│   ├── 🔊 audio-processor.js  # Audio processing
│   ├── 📸 image-processor.js  # Image processing
│   ├── 🎬 video-creator.js    # Video creation
│   └── 📱 telegram-handler.js # Telegram bot
├── 📁 images/                # Presenters (Sofia 1-9)
├── 📄 dashboard.html         # Main dashboard
├── 📄 login.html            # Login page
├── 📄 admin.html            # Admin panel
├── 📄 dashboard.css         # Dashboard styles
├── 📄 dashboard.js          # Frontend logic
├── 📄 users.json           # User database
└── 📄 scraper-4-paises-final.js # News scraper
```

---

## 🎯 Use Cases

### 📺 Sports Media
- Social media content automation
- Quick sports summary generation
- 24/7 content without manual intervention

### ⚽ Football Clubs
- Automatic videos for social networks
- Match summaries and news
- Multilingual content for fans

### 📱 Content Creators
- Productivity tool for YouTubers
- Viral sports content generation
- Creative process automation

---

## 🔮 Roadmap

### Version 2.0
- [ ] 🌍 **Multilingual support** (English, Portuguese)
- [ ] 🎨 **Integrated video editor**
- [ ] 📊 **Advanced analytics dashboard**
- [ ] 🔄 **Public API** for developers

### Version 3.0  
- [ ] 🤖 **More AI models** (Claude, Gemini)
- [ ] 🎭 **Male presenters**
- [ ] 📱 **Native mobile app**
- [ ] 🏢 **Enterprise features**

---

## 📊 Project Statistics

- **🏗️ Lines of code:** 7,000+
- **📦 Dependencies:** 15
- **🎭 Presenters:** 9
- **🌍 Countries covered:** 4
- **⚡ APIs integrated:** 5
- **🔐 Security level:** Enterprise

---

## 🤝 Contributing

Contributions are welcome! 

### How to contribute:
1. Fork the project
2. Create a branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See `LICENSE` for more details.

---

## 👨‍💻 Author

**Jorge Guerrero** (@JorgeGdev)

- 🌐 [GitHub](https://github.com/JorgeGdev)
- 📧 Email: [your-email@example.com]
- 💼 [LinkedIn](https://linkedin.com/in/your-profile)

---

## 🙏 Acknowledgments

- **OpenAI** for the GPT-4 API
- **ElevenLabs** for realistic voice synthesis  
- **Hedra AI** for video generation
- **Railway** for free hosting
- **Supabase** for the database

---

## ⭐ Support the Project

If you found this project useful, please give it a ⭐ on GitHub and share it with other developers.

[![GitHub stars](https://img.shields.io/github/stars/JorgeGdev/football-video-generator?style=social)](https://github.com/JorgeGdev/football-video-generator/stargazers)

---

<div align="center">

**Made with ❤️ by Jorge Guerrero**

[⬆ Back to top](#-football-video-generator)

</div>