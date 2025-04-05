'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { collection, query, getDocs, where, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { 
  AdjustmentsHorizontalIcon,
  VideoCameraIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import FilterSidebar from '@/app/components/FilterSidebar';

interface UserProfile {
  id: string;
  photoURL: string;
  displayName: string;
  age: number;
  location: string;
  entrepreneurType: string;
  businessStage: string;
  online: boolean;
  gender: 'male' | 'female';
  bio: string;
  interests: string[];
}

interface FilterOptions {
  ageRange: {
    min: number;
    max: number;
  };
  entrepreneurTypes: string[];
  businessStages: string[];
  location: string;
  onlineOnly: boolean;
}

export default function DiscoverPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayType, setOverlayType] = useState<'like' | 'dislike' | null>(null);
  const [showMessagePopup, setShowMessagePopup] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    ageRange: { min: 18, max: 65 },
    entrepreneurTypes: [],
    businessStages: [],
    location: '',
    onlineOnly: false
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    const loadProfiles = async () => {
      if (!user) return;

      try {
        // First get the current user's profile to determine their gender
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const userGender = userData?.gender || 'male';
        
        // Determine which gender to show based on user's gender
        const showGender = userGender === 'male' ? 'female' : 'male';
        console.log('User gender:', userGender, 'Showing profiles for:', showGender);

        const profilesRef = collection(db, 'users');
        const q = query(
          profilesRef,
          where('inDiscovery', '==', true),
          where('onboardingCompleted', '==', true),
          where('gender', '==', showGender)
        );
        const querySnapshot = await getDocs(q);
        const fetchedProfiles: UserProfile[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (doc.id !== user.uid) {
            fetchedProfiles.push({
              id: doc.id,
              photoURL: data.photoURL || '/default-avatar.png',
              displayName: data.displayName || 'Anonymous',
              age: data.age || 0,
              location: data.location || 'Unknown',
              entrepreneurType: data.entrepreneurType || '',
              businessStage: data.businessStage || '',
              online: Math.random() < 0.3,
              gender: data.gender || 'male',
              bio: data.bio || '',
              interests: data.interests || []
            });
          }
        });

        console.log('Loaded profiles:', fetchedProfiles.length);
        setProfiles(fetchedProfiles);
        setFilteredProfiles(fetchedProfiles);
      } catch (error) {
        console.error('Error loading profiles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, [user, loading, router]);

  // Apply filters whenever they change
  useEffect(() => {
    let filtered = [...profiles];

    // Filter by age range
    filtered = filtered.filter(
      (profile) => profile.age >= filters.ageRange.min && profile.age <= filters.ageRange.max
    );

    // Filter by entrepreneur types
    if (filters.entrepreneurTypes.length > 0) {
      filtered = filtered.filter((profile) =>
        filters.entrepreneurTypes.includes(profile.entrepreneurType)
      );
    }

    // Filter by business stages
    if (filters.businessStages.length > 0) {
      filtered = filtered.filter((profile) =>
        filters.businessStages.includes(profile.businessStage)
      );
    }

    // Filter by location
    if (filters.location) {
      filtered = filtered.filter((profile) =>
        profile.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Filter by online status
    if (filters.onlineOnly) {
      filtered = filtered.filter((profile) => profile.online);
    }

    setFilteredProfiles(filtered);
  }, [filters, profiles]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentProfile) return;
    
    setDirection(direction === 'right' ? 1 : -1);
    setOverlayType(direction === 'right' ? 'like' : 'dislike');
    setShowOverlay(true);
    
    // Hide overlay after animation
    setTimeout(() => {
      setShowOverlay(false);
      setCurrentIndex((prev) => prev + 1);
    }, 500);
  };

  const handleLike = () => {
    handleSwipe('right');
  };

  const handleDislike = async () => {
    if (!user || !currentProfile) return;
    
    try {
      // Calculate expiration date (6 months from now)
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      
      // Store rejection in Firebase with timestamp and expiration
      const rejectedRef = collection(db, 'rejectedProfiles');
      await addDoc(rejectedRef, {
        userId: user.uid,
        rejectedProfileId: currentProfile.id,
        rejectedAt: serverTimestamp(),
        expiresAt: sixMonthsFromNow
      });

      handleSwipe('left');
    } catch (err) {
      console.error('Error storing rejection:', err);
    }
  };

  const handleMessage = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setShowMessagePopup(true);
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentProfile = filteredProfiles[currentIndex];

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No more profiles</h2>
          <p className="text-gray-600">Check back later for new matches!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Filter Bar */}
      <div className="sticky top-16 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
              <span>Filters</span>
            </button>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {filteredProfiles.length} matches found
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-md mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentProfile.id}
              initial={{ opacity: 0, x: -300 * direction }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 * direction }}
              transition={{ duration: 0.3 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = offset.x * velocity.x;
                if (Math.abs(swipe) > 10000) {
                  handleSwipe(swipe > 0 ? 'right' : 'left');
                }
              }}
              className="bg-white rounded-xl shadow-lg overflow-hidden relative"
            >
              <div className="relative h-[600px]">
                {/* Overlay for Like/Dislike */}
                <AnimatePresence>
                  {showOverlay && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.3 }}
                      className="absolute bottom-32 left-[40%] z-10"
                    >
                      <div className={`rounded-full p-4 shadow-lg ${
                        overlayType === 'like' 
                          ? 'bg-green-500/90' 
                          : 'bg-red-500/90'
                      }`}>
                        {overlayType === 'like' ? (
                          <CheckIcon className="h-12 w-12 text-white" />
                        ) : (
                          <XMarkIcon className="h-12 w-12 text-white" />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Image
                  src={currentProfile.photoURL}
                  alt={currentProfile.displayName}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Message Button */}
                <button
                  onClick={() => handleMessage(currentProfile)}
                  className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                >
                  <ChatBubbleLeftIcon className="h-6 w-6 text-gray-700" />
                </button>

                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-2xl font-bold mb-2">{currentProfile.displayName}, {currentProfile.age}</h3>
                  <p className="text-lg mb-2">{currentProfile.location}</p>
                  <p className="text-lg mb-2">{currentProfile.entrepreneurType}</p>
                  <p className="text-lg mb-2">{currentProfile.businessStage}</p>
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 mb-4 shadow-lg">
                    <p className="text-gray-800 text-base italic">{currentProfile.bio}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currentProfile.interests.map((interest, index) => (
                      <span key={index} className="bg-white/20 px-3 py-1 rounded-full text-sm">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-8 p-6">
                <button
                  onClick={handleDislike}
                  className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors transform hover:scale-110 active:scale-95"
                >
                  <XMarkIcon className="h-8 w-8" />
                </button>
                <button
                  onClick={handleLike}
                  className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-colors transform hover:scale-110 active:scale-95"
                >
                  <HeartIcon className="h-8 w-8" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Message Popup */}
      {showMessagePopup && selectedProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Send message to {selectedProfile.displayName}</h3>
              <button
                onClick={() => {
                  setShowMessagePopup(false);
                  setSelectedProfile(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowMessagePopup(false);
                  setSelectedProfile(null);
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => router.push(`/chat/${selectedProfile.id}`)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 