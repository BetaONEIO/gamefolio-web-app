import { useState } from "react";
import { motion } from "motion/react";
import { Flame, Home, Compass, Plus, TrendingUp, User, Heart, MonitorPlay } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import PlatformBadge from "./PlatformBadge";
import ClipCard from "./ClipCard";

export default function GamingProfile() {
  const [activeTab, setActiveTab] = useState("clips");
  const [activeNav, setActiveNav] = useState("profile");

  const platforms = [
    { id: "pc", icon: MonitorPlay, label: "Set up", color: "bg-gray-700" },
    { id: "playstation", label: "Set up", color: "bg-blue-600" },
    { id: "xbox", label: "Set up", color: "bg-green-600" },
    { id: "steam", label: "Set up", color: "bg-slate-600" },
  ];

  const clips = [
    {
      id: 1,
      thumbnail: "https://images.unsplash.com/photo-1636617920878-b780053fef18?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvdmVyd2F0Y2glMjBnYW1lcGxheXxlbnwxfHx8fDE3NjI5MzM3MTN8MA&ixlib=rb-4.1.0&q=80&w=1080",
      duration: "1:00",
      user: "@Player1",
      game: "Overwatch 2",
      title: "Popping off",
      timeAgo: "2d",
    },
    {
      id: 2,
      thumbnail: "https://images.unsplash.com/photo-1598931587008-88cc8a5e3a40?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBzY3JlZW58ZW58MXx8fHwxNzYyOTMzNzIxfDA&ixlib=rb-4.1.0&q=80&w=1080",
      duration: "0:45",
      user: "@Player1",
      game: "Valorant",
      title: "Ace clutch",
      timeAgo: "3d",
    },
  ];

  const tabs = [
    { id: "clips", label: "Clips" },
    { id: "reels", label: "Reels" },
    { id: "shots", label: "Shots" },
    { id: "saved", label: "Saved" },
  ];

  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "explore", icon: Compass, label: "Explore" },
    { id: "post", icon: Plus, label: "Post" },
    { id: "trending", icon: TrendingUp, label: "Trending" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gradient-to-b from-[#0a1628] to-[#142236] text-white relative pb-20">
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-3 text-white/90">
        <span>20:34</span>
        <div className="flex items-center gap-1">
          <div className="flex gap-[2px]">
            <div className="w-1 h-3 bg-white rounded-full" />
            <div className="w-1 h-3 bg-white rounded-full" />
            <div className="w-1 h-3 bg-white rounded-full" />
            <div className="w-1 h-3 bg-white/50 rounded-full" />
          </div>
          <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
          <div className="w-6 h-3 border-2 border-white rounded-sm relative ml-1">
            <div className="absolute inset-0.5 bg-white rounded-[1px]" />
            <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-white rounded-r" />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center pt-4 pb-6">
        <h1 className="text-white">Player 1</h1>
        <p className="text-gray-400 mt-1">@Player1</p>
      </div>

      {/* Platform badges */}
      <div className="flex items-center gap-2 px-6 mb-8 overflow-x-auto">
        {platforms.map((platform) => (
          <PlatformBadge key={platform.id} {...platform} />
        ))}
      </div>

      {/* Profile section */}
      <div className="flex flex-col items-center px-6 mb-8">
        {/* Profile image with ring */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
          className="relative mb-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full blur-lg opacity-50" />
          <div className="relative w-40 h-40 rounded-full p-1 bg-gradient-to-br from-emerald-400 to-teal-500">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1667970573560-6ecf6a143514?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1lciUyMHBvcnRyYWl0fGVufDF8fHx8MTc2Mjg0ODczOHww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Player avatar"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </motion.div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 mb-6">
          <motion.div
            className="text-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-white">2,720</span>
            </div>
          </motion.div>
          
          <motion.div
            className="text-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <p className="text-gray-400 mb-1">Followers</p>
            <span className="text-white">12</span>
          </motion.div>

          <motion.div
            className="text-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <p className="text-gray-400 mb-1">Following</p>
            <span className="text-white">15</span>
          </motion.div>
        </div>

        {/* Edit profile button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-white/10 hover:bg-white/15 text-white py-3 rounded-lg backdrop-blur-sm border border-white/10 transition-colors"
        >
          Edit Profile
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-6 mb-6 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative px-6 py-3 transition-colors"
          >
            <span
              className={`${
                activeTab === tab.id ? "text-emerald-400" : "text-gray-400"
              }`}
            >
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Clips section */}
      <div className="px-6">
        <div className="flex items-center gap-2 mb-4">
          <MonitorPlay className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400">Clips</span>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-gray-400">All games (22)</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Clips grid */}
        <div className="space-y-4">
          {clips.map((clip) => (
            <ClipCard key={clip.id} {...clip} />
          ))}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a1628]/95 backdrop-blur-lg border-t border-white/10">
        <div className="max-w-md mx-auto flex items-center justify-around py-3 px-6">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center gap-1"
            >
              <item.icon
                className={`w-6 h-6 ${
                  activeNav === item.id ? "text-emerald-400" : "text-gray-400"
                }`}
              />
              <span
                className={`text-xs ${
                  activeNav === item.id ? "text-emerald-400" : "text-gray-400"
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
