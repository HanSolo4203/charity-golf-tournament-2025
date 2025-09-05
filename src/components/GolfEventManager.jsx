import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Trophy, Users, Coffee, Camera, Download, Edit, Plus, X, Eye, EyeOff, Trash2, Gift, Settings, Lock, Unlock, Save, Gavel } from 'lucide-react';
import { db, supabase } from '../lib/supabase';

const GolfEventManager = ({ onNavigateToAuction }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextEventIndex, setNextEventIndex] = useState(0);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showRaffleModal, setShowRaffleModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingEventIndex, setEditingEventIndex] = useState(-1);
  const [editingRaffle, setEditingRaffle] = useState(null);
  const [editingRaffleIndex, setEditingRaffleIndex] = useState(-1);
  const [expandedEvents, setExpandedEvents] = useState(new Set());
  const [logoUploads, setLogoUploads] = useState({});
  const [organizationLogoUpload, setOrganizationLogoUpload] = useState(null);
  const [organizationSettings, setOrganizationSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Auction manager state
  const [activeTab, setActiveTab] = useState('events'); // 'events', 'raffle', 'auction', 'admin-settings'
  const [auctionBids, setAuctionBids] = useState([]);
  const [highestBid, setHighestBid] = useState(null);
  const [totalBidders, setTotalBidders] = useState(0);
  const [loadingAuction, setLoadingAuction] = useState(false);
  
  // Painting editing state
  const [painting, setPainting] = useState(null);
  const [showPaintingModal, setShowPaintingModal] = useState(false);
  const [editingPainting, setEditingPainting] = useState(null);

  // Remove hardcoded password - now using database authentication

  // Load auction data
  const loadAuctionData = async () => {
    try {
      setLoadingAuction(true);
      
      // Get painting information
      const paintingData = await db.getPainting(1);
      setPainting(paintingData);
      
      // Get all bids for the painting (painting ID 1)
      const bids = await db.getBids(1);
      setAuctionBids(bids);
      
      // Get highest bid
      const highest = await db.getHighestBid(1);
      setHighestBid(highest);
      
      // Count unique bidders
      const uniqueBidders = new Set(bids.map(bid => bid.bidder_name));
      setTotalBidders(uniqueBidders.size);
      
    } catch (err) {
      console.error('Error loading auction data:', err);
      setError('Failed to load auction data');
    } finally {
      setLoadingAuction(false);
    }
  };

  // Setup real-time subscription for auction updates
  const setupAuctionRealtime = () => {
    const channel = supabase
      .channel('auction_admin_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: 'painting_id=eq.1'
        },
        () => {
          // Reload auction data when new bid is added
          loadAuctionData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Painting editing functions
  const openPaintingModal = (paintingData = null) => {
    setEditingPainting(paintingData || painting);
    setShowPaintingModal(true);
  };

  const savePainting = async () => {
    try {
      if (!editingPainting) return;

      const { data, error } = await supabase
        .from('paintings')
        .update({
          title: editingPainting.title,
          artist: editingPainting.artist,
          year: editingPainting.year,
          medium: editingPainting.medium,
          dimensions: editingPainting.dimensions,
          description: editingPainting.description,
          image_url: editingPainting.image_url,
          starting_bid: editingPainting.starting_bid,
          estimated_value: editingPainting.estimated_value,
          condition: editingPainting.condition,
          provenance: editingPainting.provenance,
          auction_end: editingPainting.auction_end,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPainting.id)
        .select()
        .single();

      if (error) throw error;

      setPainting(data);
      setShowPaintingModal(false);
      setEditingPainting(null);
      
      // Reload auction data to reflect changes
      loadAuctionData();
      
    } catch (err) {
      console.error('Error saving painting:', err);
      setError('Failed to save painting changes');
    }
  };

  const [events, setEvents] = useState([
    {
      id: 1,
      time: '06:00',
      title: 'Breakfast',
      description: 'Start your day with a hearty breakfast',
      location: 'Main Clubhouse',
      participants: 'All Players',
      eventType: 'Dining',
      icon: 'Coffee',
      color: 'amber',
      additionalInfo: 'Full English breakfast buffet including continental options. Vegetarian and gluten-free alternatives available. Coffee, tea, and fresh juices served. Please arrive 15 minutes early to ensure smooth service.',
      contactPerson: 'Sarah Johnson',
      contactPhone: '+27 82 123 4567',
      specialNotes: 'Dietary requirements must be communicated 24 hours in advance.'
    },
    {
      id: 2,
      time: '06:45',
      title: 'Transfer to Golf Course',
      description: 'Golfers depart for the course',
      location: 'Hotel Lobby',
      participants: 'Tournament Players',
      eventType: 'Transportation',
      icon: 'MapPin',
      color: 'blue',
      additionalInfo: 'Shuttle buses will depart from the hotel lobby every 15 minutes. Golf clubs and equipment will be transported separately. Please ensure your golf bag is clearly labeled with your name. Journey time approximately 20 minutes.',
      contactPerson: 'Mike Thompson',
      contactPhone: '+27 82 234 5678',
      specialNotes: 'Last shuttle departs at 07:00 sharp. Late arrivals will need to arrange alternative transport.'
    },
    {
      id: 3,
      time: '07:00',
      title: 'Tee-Off (Sharp Start)',
      description: '18-hole tournament begins - be ready!',
      location: 'Golf Course - First Tee',
      participants: 'Tournament Players',
      eventType: 'Competition',
      icon: 'Trophy',
      color: 'emerald',
      additionalInfo: 'Shotgun start format with groups of 4 players. Each group will be assigned a starting hole. Tournament rules briefing at 06:45. Handicap certificates required. GPS devices and rangefinders permitted.',
      contactPerson: 'David Wilson',
      contactPhone: '+27 82 345 6789',
      specialNotes: 'Players must be at their assigned tee 10 minutes before start time. Dress code: Collared shirts and golf shoes required.'
    },
    {
      id: 4,
      time: '08:00',
      title: 'Kids\' Treasure Hunt',
      description: 'Special activity for the young ones',
      location: 'Clubhouse Gardens',
      participants: 'Children & Families',
      eventType: 'Activity',
      icon: 'Users',
      color: 'violet',
      additionalInfo: 'Exciting treasure hunt with golf-themed clues and prizes. Children will be divided into age groups: 5-8 years and 9-12 years. Parental supervision required. Prizes include golf lessons and junior equipment.',
      contactPerson: 'Lisa Chen',
      contactPhone: '+27 82 456 7890',
      specialNotes: 'Registration required by 07:30. Children should wear comfortable clothing and closed shoes. Snacks and refreshments provided.'
    },
    {
      id: 5,
      time: '13:30',
      title: 'Lunch Time',
      description: 'Lunch available (own account) - mini-competitions during lunch',
      location: 'Restaurant Terrace',
      participants: 'All Attendees',
      eventType: 'Dining',
      icon: 'Coffee',
      color: 'amber',
      additionalInfo: 'A la carte menu available with golf-themed specials. Mini putting competition on the terrace. Longest drive challenge using foam balls. Prizes for competition winners. Cash and card payments accepted.',
      contactPerson: 'Chef Marco',
      contactPhone: '+27 82 567 8901',
      specialNotes: 'Reservations recommended for groups larger than 6. Special dietary requirements can be accommodated with advance notice.'
    },
    {
      id: 6,
      time: '15:30',
      title: 'Prize Giving Ceremony',
      description: 'Awards presentation and celebration',
      location: 'Main Function Room',
      participants: 'All Attendees',
      eventType: 'Ceremony',
      icon: 'Trophy',
      color: 'yellow',
      additionalInfo: 'Presentation of tournament trophies and prizes. Special recognition for charity fundraising achievements. Guest speaker: Professional golfer and charity ambassador. Light refreshments and networking opportunity.',
      contactPerson: 'Emma Rodriguez',
      contactPhone: '+27 82 678 9012',
      specialNotes: 'Formal dress code recommended. Photography and video recording permitted. Live streaming available for remote attendees.'
    },
    {
      id: 7,
      time: '16:00',
      title: 'End of Golf Tournament',
      description: 'Thank you for participating in our Charity Golf Day!',
      location: 'Main Function Room',
      participants: 'All Attendees',
      eventType: 'Ceremony',
      icon: 'Trophy',
      color: 'emerald',
      additionalInfo: 'Final thank you and closing remarks. Collection of feedback forms. Information about next year\'s event. Charity donation collection and final fundraising total announcement.',
      contactPerson: 'Event Coordinator',
      contactPhone: '+27 82 789 0123',
      specialNotes: 'Please complete feedback forms before leaving. Shuttle service back to hotel available until 17:00.'
    }
  ]);

  const [raffleItems, setRaffleItems] = useState([
    {
      id: 1,
      prize: 'Golf Equipment Set',
      sponsor: 'Pro Golf Shop',
      value: '$500',
      description: 'Complete set of premium golf clubs',
      logo: 'https://via.placeholder.com/120x60/2563eb/ffffff?text=PRO+GOLF'
    },
    {
      id: 2,
      prize: 'Weekend Golf Package',
      sponsor: 'Mountain View Resort',
      value: '$800',
      description: '2 nights accommodation + golf for 2',
      logo: 'https://via.placeholder.com/120x60/059669/ffffff?text=MOUNTAIN+VIEW'
    },
    {
      id: 3,
      prize: 'Golf Lesson Package',
      sponsor: 'Elite Golf Academy',
      value: '$300',
      description: '5 private lessons with PGA professional',
      logo: 'https://via.placeholder.com/120x60/7c3aed/ffffff?text=ELITE+ACADEMY'
    }
  ]);

  const iconMap = {
    Coffee,
    MapPin,
    Trophy,
    Users,
    Camera,
    Gift
  };

  const eventTypes = ['Competition', 'Dining', 'Transportation', 'Activity', 'Ceremony', 'Entertainment'];
  const colorOptions = ['amber', 'blue', 'emerald', 'violet', 'rose', 'orange', 'yellow'];

  useEffect(() => {
    // Load data from Supabase on component mount
    loadData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const nextIndex = events.findIndex(event => {
        const eventMinutes = parseInt(event.time.split(':')[0]) * 60 + parseInt(event.time.split(':')[1]);
        return eventMinutes > currentMinutes;
      });
      setNextEventIndex(nextIndex === -1 ? events.length : nextIndex);
    }, 60000);
    
    return () => clearInterval(timer);
  }, [events]);

  // Load auction data when auction tab is active
  useEffect(() => {
    if (activeTab === 'auction') {
      loadAuctionData();
      const cleanup = setupAuctionRealtime();
      return cleanup;
    }
  }, [activeTab]);

  const handleAdminLogin = async () => {
    try {
      if (!adminUsername || !adminPassword) {
        alert('Please enter both username and password');
        return;
      }

      const adminUser = await db.checkAdminCredentials(adminUsername, adminPassword);
      
      if (adminUser) {
        setIsAdminMode(true);
        setShowPasswordModal(false);
        setAdminUsername('');
        setAdminPassword('');
      } else {
        alert('Invalid admin credentials');
        setAdminPassword('');
      }
    } catch (err) {
      console.error('Error during admin login:', err);
      alert('Login failed. Please try again.');
      setAdminPassword('');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminMode(false);
    setShowEventModal(false);
    setShowRaffleModal(false);
  };

  const openEventModal = (event = null, index = -1) => {
    if (event) {
      setEditingEvent({ ...event });
      setEditingEventIndex(index);
    } else {
      setEditingEvent({
        id: Date.now(),
        time: '12:00',
        title: '',
        description: '',
        location: '',
        participants: '',
        eventType: 'Activity',
        icon: 'Users',
        color: 'blue',
        additionalInfo: '',
        contactPerson: '',
        contactPhone: '',
        specialNotes: ''
      });
      setEditingEventIndex(-1);
    }
    setShowEventModal(true);
  };

  const saveEvent = async () => {
    try {
      const eventData = {
        time: editingEvent.time,
        title: editingEvent.title,
        description: editingEvent.description,
        location: editingEvent.location,
        participants: editingEvent.participants,
        event_type: editingEvent.eventType,
        icon: editingEvent.icon,
        color: editingEvent.color,
        additional_info: editingEvent.additionalInfo,
        contact_person: editingEvent.contactPerson,
        contact_phone: editingEvent.contactPhone,
        special_notes: editingEvent.specialNotes
      };

      if (editingEventIndex >= 0) {
        // Update existing event
        await db.updateEvent(editingEvent.id, eventData);
        const updatedEvents = [...events];
        updatedEvents[editingEventIndex] = { ...editingEvent, ...eventData };
        setEvents(updatedEvents);
      } else {
        // Create new event
        const newEvent = await db.createEvent(eventData);
        setEvents([...events, newEvent]);
      }
      
      setShowEventModal(false);
      setEditingEvent(null);
      setEditingEventIndex(-1);
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Failed to save event. Please try again.');
    }
  };

  const deleteEvent = async (index) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await db.deleteEvent(events[index].id);
        const updatedEvents = events.filter((_, i) => i !== index);
        setEvents(updatedEvents);
      } catch (err) {
        console.error('Error deleting event:', err);
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  const openRaffleModal = (item = null, index = -1) => {
    if (item) {
      setEditingRaffle({ ...item });
      setEditingRaffleIndex(index);
    } else {
      setEditingRaffle({
        id: Date.now(),
        prize: '',
        sponsor: '',
        value: '',
        description: '',
        logo: ''
      });
      setEditingRaffleIndex(-1);
    }
    setShowRaffleModal(true);
  };

  const saveRaffle = async () => {
    try {
      const raffleToSave = { ...editingRaffle };
      
      // Handle logo upload to Supabase Storage
      if (logoUploads[editingRaffle.id]) {
        const logoFile = logoUploads[editingRaffle.id];
        const fileName = `logo-${editingRaffle.id}-${Date.now()}.png`;
        
        // Upload to Supabase Storage
        await db.uploadLogo(logoFile, fileName);
        
        // Get the public URL
        const logoUrl = await db.getLogoUrl(fileName);
        raffleToSave.logo_url = logoUrl;
        
        // Remove from uploads after saving
        setLogoUploads(prev => {
          const newUploads = { ...prev };
          delete newUploads[editingRaffle.id];
          return newUploads;
        });
      }
      
      const raffleData = {
        prize: raffleToSave.prize,
        sponsor: raffleToSave.sponsor,
        value: raffleToSave.value,
        description: raffleToSave.description,
        logo_url: raffleToSave.logo_url || raffleToSave.logo
      };
      
      if (editingRaffleIndex >= 0) {
        // Update existing raffle item
        const updatedRaffle = await db.updateRaffleItem(editingRaffle.id, raffleData);
        const updatedRaffles = [...raffleItems];
        updatedRaffles[editingRaffleIndex] = updatedRaffle;
        setRaffleItems(updatedRaffles);
      } else {
        // Create new raffle item
        const newRaffle = await db.createRaffleItem(raffleData);
        setRaffleItems([...raffleItems, newRaffle]);
      }
      
      setShowRaffleModal(false);
      setEditingRaffle(null);
      setEditingRaffleIndex(-1);
    } catch (err) {
      console.error('Error saving raffle item:', err);
      alert('Failed to save raffle item. Please try again.');
    }
  };

  const deleteRaffle = async (index) => {
    if (confirm('Are you sure you want to delete this raffle item?')) {
      try {
        await db.deleteRaffleItem(raffleItems[index].id);
        const updatedRaffles = raffleItems.filter((_, i) => i !== index);
        setRaffleItems(updatedRaffles);
      } catch (err) {
        console.error('Error deleting raffle item:', err);
        alert('Failed to delete raffle item. Please try again.');
      }
    }
  };

  const toggleEventExpansion = (eventId) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const handleLogoUpload = (event, raffleId) => {
    const file = event.target.files[0];
    if (file) {
      setLogoUploads(prev => ({
        ...prev,
        [raffleId]: file
      }));
    }
  };

  const removeLogo = (raffleId) => {
    setLogoUploads(prev => {
      const newUploads = { ...prev };
      delete newUploads[raffleId];
      return newUploads;
    });
  };

  const handleOrganizationLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setOrganizationLogoUpload(file);
    }
  };

  const removeOrganizationLogo = () => {
    setOrganizationLogoUpload(null);
  };

  const saveOrganizationLogo = async () => {
    if (!organizationLogoUpload) return;
    
    try {
      const fileName = `organization-logo-${Date.now()}.png`;
      
      // Upload to Supabase Storage
      await db.uploadLogo(organizationLogoUpload, fileName);
      
      // Get the public URL
      const logoUrl = await db.getLogoUrl(fileName);
      
      // Update organization settings
      await db.updateOrganizationSetting('organization_logo_url', logoUrl);
      
      // Update local state
      setOrganizationSettings(prev => ({
        ...prev,
        organization_logo_url: logoUrl
      }));
      
      // Clear upload
      setOrganizationLogoUpload(null);
      
      alert('Organization logo updated successfully!');
    } catch (err) {
      console.error('Error updating organization logo:', err);
      alert('Failed to update organization logo. Please try again.');
    }
  };

  // Load data from Supabase
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load events, raffle items, and organization settings in parallel
      const [eventsData, raffleData, orgSettingsData] = await Promise.all([
        db.getEvents(),
        db.getRaffleItems(),
        db.getOrganizationSettings()
      ]);
      
      setEvents(eventsData);
      setRaffleItems(raffleData);
      setOrganizationSettings(orgSettingsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const getColorClasses = (color, isActive = false, isPast = false) => {
    if (isPast) return 'bg-slate-50 border-slate-200 text-slate-500';
    if (isActive) return 'bg-slate-800 border-slate-900 text-white shadow-xl';
    
    const colors = {
      amber: 'bg-amber-50 border-amber-200 text-amber-900',
      blue: 'bg-blue-50 border-blue-200 text-blue-900',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      violet: 'bg-violet-50 border-violet-200 text-violet-900',
      rose: 'bg-rose-50 border-rose-200 text-rose-900',
      orange: 'bg-orange-50 border-orange-200 text-orange-900',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900'
    };
    return colors[color] || colors.blue;
  };

  const isCurrentEvent = (index) => index === nextEventIndex - 1;
  const isUpcomingEvent = (index) => index === nextEventIndex;
  const isPastEvent = (index) => index < nextEventIndex - 1;

  const generatePDFContent = () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Charity Golf Day Itinerary</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; }
        .header { text-align: center; margin-bottom: 50px; border-bottom: 2px solid #e2e8f0; padding-bottom: 30px; }
        .timeline-item { margin-bottom: 25px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .time { font-weight: 600; font-size: 18px; color: #0369a1; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; display: inline-block; }
        .title { font-size: 16px; font-weight: 600; margin: 10px 0 5px 0; }
        .description { color: #64748b; line-height: 1.5; }
        .location { color: #059669; font-weight: 500; }
        .participants { color: #7c3aed; font-style: italic; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Charity Golf Day Itinerary</h1>
        <p>Professional Tournament Timeline</p>
    </div>
    ${events.map(event => `
        <div class="timeline-item">
            <div class="time">${event.time}</div>
            <div class="title">${event.title}</div>
            <div class="description">${event.description}</div>
            <div class="location">📍 ${event.location}</div>
            <div class="participants">👥 ${event.participants}</div>
        </div>
    `).join('')}
</body>
</html>`;
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Admin Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Admin Access</h3>
              <button onClick={() => setShowPasswordModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter admin username"
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter admin password"
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAdminLogin}
                className="flex-1 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 relative overflow-hidden">
        {/* Golf Course Background */}
        <div className="absolute inset-0 opacity-15">
          <div className="w-full h-full bg-cover bg-center bg-no-repeat" style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1535131749006-b7f58c99034b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`
          }}></div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-8 relative z-10">
          {isAdminMode ? (
            /* Admin Panel Header */
            <div className="flex items-center justify-between mb-8">
              <img 
                src={organizationSettings.organization_logo_url || "https://via.placeholder.com/480x160/0f172a/ffffff?text=YOUR+LOGO"} 
                alt="Organization Logo" 
                className="h-20 w-auto object-contain"
              />
              <div className="text-center flex-1">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Golf Day Admin Panel</h1>
                <p className="text-lg font-semibold text-blue-600">6th September 2025</p>
              </div>
              <div className="inline-flex items-center gap-3 bg-slate-800 text-white rounded-lg px-6 py-3 shadow-sm">
                <Clock className="w-5 h-5" />
                <span className="text-xl font-mono font-semibold">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ) : (
            /* Regular Header */
            <div className="mb-8 text-center">
              <img 
                src={organizationSettings.organization_logo_url || "https://via.placeholder.com/480x160/0f172a/ffffff?text=YOUR+LOGO"} 
                alt="Organization Logo" 
                className="mx-auto h-64 w-auto object-contain"
              />
            </div>
          )}

          <div className="text-center">
            {!isAdminMode && (
              <>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Charity Golf Day Itinerary</h1>
                <p className="text-2xl font-semibold text-blue-600 mb-2">6th September 2025</p>
              </>
            )}
            
            {!isAdminMode && (
              <div className="inline-flex items-center gap-3 bg-slate-800 text-white rounded-lg px-6 py-3 shadow-sm">
                <Clock className="w-5 h-5" />
                <span className="text-xl font-mono font-semibold">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {/* Admin Dashboard Controls */}
            {isAdminMode && (
              <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Admin Dashboard</h3>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => openEventModal()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Event
                  </button>
                  <button
                    onClick={() => openRaffleModal()}
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Gift className="w-4 h-4" />
                    Add Raffle Prize
                  </button>
                  <button
                    onClick={() => {
                      const content = generatePDFContent();
                      const blob = new Blob([content], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'Charity_Golf_Day_Itinerary.html';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Loading and Error States */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-slate-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Loading golf tournament data...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2 text-red-800">
              <span className="text-sm font-medium">Error:</span>
              <span className="text-sm">{error}</span>
              <button
                onClick={loadData}
                className="ml-auto text-red-600 hover:text-red-800 text-sm font-medium underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'events'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Events
          </button>
          <button
            onClick={() => setActiveTab('raffle')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'raffle'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Gift className="w-4 h-4 inline mr-2" />
            Raffle
          </button>
          <button
            onClick={() => setActiveTab('auction')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'auction'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Gavel className="w-4 h-4 inline mr-2" />
            Auction
          </button>
          {isAdminMode && (
            <button
              onClick={() => setActiveTab('admin-settings')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'admin-settings'
                  ? 'border-slate-500 text-slate-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Admin Settings
            </button>
          )}
        </div>

        {!isLoading && !error && (
          <>
            {/* Events Tab Content */}
            {activeTab === 'events' && (
              <>
                {/* Next Event Alert */}
                {nextEventIndex < events.length && (
              <div className="bg-slate-800 text-white rounded-xl p-6 mb-8 shadow-sm">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Up Next
                </h3>
                <div className="flex items-center gap-6">
                  <div className="text-2xl font-mono font-bold bg-white/10 rounded-lg px-4 py-2 border border-white/20">
                    {events[nextEventIndex].time}
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{events[nextEventIndex].title}</div>
                    <div className="text-slate-300 text-sm mt-1">{events[nextEventIndex].description}</div>
                    <div className="text-slate-400 text-xs mt-1">
                      📍 {events[nextEventIndex].location} • 👥 {events[nextEventIndex].participants}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-300"></div>

              <div className="space-y-6">
                {events.map((event, index) => {
                  const IconComponent = iconMap[event.icon] || Users;
                  const isActive = isCurrentEvent(index);
                  const isNext = isUpcomingEvent(index);
                  const isPast = isPastEvent(index);
                  
                  return (
                    <div key={event.id} className="relative flex items-start">
                      <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-2 transition-all duration-300 ${
                        isActive ? 'bg-slate-800 border-slate-900 shadow-lg' :
                        isNext ? 'bg-green-600 border-green-700 shadow-md' :
                        isPast ? 'bg-slate-200 border-slate-300' :
                        'bg-white border-slate-300 shadow-sm'
                      }`}>
                        <IconComponent className={`w-7 h-7 ${
                          isActive || isNext ? 'text-white' :
                          isPast ? 'text-slate-400' :
                          'text-slate-600'
                        }`} />
                      </div>

                      <div className={`ml-6 flex-1 p-6 rounded-xl border-2 transition-all duration-300 shadow-sm relative ${
                        getColorClasses(event.color, isActive, isPast)
                      }`}>
                        {/* Admin Controls */}
                        {isAdminMode && (
                          <div className="absolute top-4 right-4 flex gap-2">
                            <button
                              onClick={() => openEventModal(event, index)}
                              className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteEvent(index)}
                              className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <span className={`text-xl font-mono font-semibold px-3 py-1.5 rounded-lg ${
                              isActive ? 'bg-white/20 text-white' :
                              isPast ? 'bg-slate-100 text-slate-500' :
                              'bg-white shadow-sm border border-slate-200 text-slate-700'
                            }`}>
                              {event.time}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              isActive ? 'bg-white/20 text-white' :
                              isPast ? 'bg-slate-200 text-slate-500' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {event.event_type}
                            </span>
                          </div>
                        </div>
                        
                        <h3 className={`text-lg font-semibold mb-2 ${
                          isActive ? 'text-white' :
                          isPast ? 'text-slate-400' :
                          'text-slate-900'
                        }`}>
                          {event.title}
                        </h3>
                        
                        <p className={`text-sm leading-relaxed mb-3 ${
                          isActive ? 'text-slate-200' :
                          isPast ? 'text-slate-400' :
                          'text-slate-600'
                        }`}>
                          {event.description}
                        </p>

                        <div className="flex flex-wrap gap-4 text-sm mb-4">
                          <div className={`flex items-center gap-1 ${
                            isActive ? 'text-slate-300' :
                            isPast ? 'text-slate-400' :
                            'text-slate-600'
                          }`}>
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                          <div className={`flex items-center gap-1 ${
                            isActive ? 'text-slate-300' :
                            isPast ? 'text-slate-400' :
                            'text-slate-600'
                          }`}>
                            <Users className="w-4 h-4" />
                            <span>{event.participants}</span>
                          </div>
                        </div>

                        {/* Dropdown Button */}
                        <button
                          onClick={() => toggleEventExpansion(event.id)}
                          className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                            isActive ? 'bg-white/20 text-white hover:bg-white/30' :
                            isPast ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' :
                            'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {expandedEvents.has(event.id) ? (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              Show Details
                            </>
                          )}
                        </button>

                        {/* Expandable Content */}
                        {expandedEvents.has(event.id) && (
                          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                            <div>
                              <h4 className={`font-semibold mb-2 ${
                                isActive ? 'text-white' :
                                isPast ? 'text-slate-500' :
                                'text-slate-800'
                              }`}>Additional Information</h4>
                              <p className={`text-sm leading-relaxed ${
                                isActive ? 'text-slate-200' :
                                isPast ? 'text-slate-400' :
                                'text-slate-600'
                              }`}>{event.additional_info}</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className={`font-semibold mb-1 ${
                                  isActive ? 'text-white' :
                                  isPast ? 'text-slate-500' :
                                  'text-slate-800'
                                }`}>Contact Person</h4>
                                <p className={`text-sm ${
                                  isActive ? 'text-slate-200' :
                                  isPast ? 'text-slate-400' :
                                  'text-slate-600'
                                }`}>{event.contact_person}</p>
                              </div>
                              <div>
                                <h4 className={`font-semibold mb-1 ${
                                  isActive ? 'text-white' :
                                  isPast ? 'text-slate-500' :
                                  'text-slate-800'
                                }`}>Contact Phone</h4>
                                <p className={`text-sm ${
                                  isActive ? 'text-slate-200' :
                                  isPast ? 'text-slate-400' :
                                  'text-slate-600'
                                }`}>{event.contact_phone}</p>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className={`font-semibold mb-1 ${
                                isActive ? 'text-white' :
                                isPast ? 'text-slate-500' :
                                'text-slate-800'
                              }`}>Special Notes</h4>
                              <p className={`text-sm ${
                                isActive ? 'text-slate-200' :
                                isPast ? 'text-slate-400' :
                                'text-slate-600'
                              }`}>{event.special_notes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
              </>
            )}


            {/* Raffle Tab Content */}
            {activeTab === 'raffle' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Raffle Prizes</h2>
                  <p className="text-slate-600">Amazing prizes up for grabs!</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {raffleItems.map((item, index) => (
                    <div key={item.id} className="relative p-6 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                      {isAdminMode && (
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button
                            onClick={() => openRaffleModal(item, index)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteRaffleItem(index)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      
                      <div className="mb-4">
                        <img
                          src={item.logo_url}
                          alt={`${item.sponsor} logo`}
                          className="w-full h-16 object-contain rounded"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                      
                      <h4 className="font-semibold text-slate-900 mb-2">{item.prize}</h4>
                      <p className="text-sm text-slate-600 mb-3">{item.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-purple-600">{item.value}</span>
                        <span className="text-xs text-slate-500">by {item.sponsor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Auction Tab Content */}
            {activeTab === 'auction' && (
              <div className="space-y-8">
                {/* View Item Button */}
                {onNavigateToAuction && (
                  <div className="text-center">
                    <button
                      onClick={onNavigateToAuction}
                      className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-purple-700 transition-colors mx-auto"
                    >
                      <Gavel className="w-5 h-5" />
                      View Item
                    </button>
                  </div>
                )}

                {/* Painting Information */}
                {painting && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Auction Item Details</h3>
                      {isAdminMode && (
                        <button
                          onClick={() => openPaintingModal()}
                          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Painting
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">{painting.title}</h4>
                        <p className="text-gray-600 mb-2">by {painting.artist}</p>
                        <p className="text-sm text-gray-500 mb-4">{painting.year} • {painting.medium}</p>
                        <p className="text-sm text-gray-600 mb-4">{painting.description}</p>
                        
                        <div className="space-y-2 text-sm">
                          <div><span className="font-medium">Dimensions:</span> {painting.dimensions}</div>
                          <div><span className="font-medium">Condition:</span> {painting.condition}</div>
                          <div><span className="font-medium">Starting Bid:</span> 
                            <span className="font-semibold text-emerald-600 ml-1">
                              {new Intl.NumberFormat('en-MW', {
                                style: 'currency',
                                currency: 'MWK',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(painting.starting_bid)}
                            </span>
                          </div>
                          <div><span className="font-medium">Estimated Value:</span> 
                            <span className="font-semibold text-blue-600 ml-1">
                              {new Intl.NumberFormat('en-MW', {
                                style: 'currency',
                                currency: 'MWK',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(painting.estimated_value)}
                            </span>
                          </div>
                          {painting.auction_end && (
                            <div><span className="font-medium">Auction Ends:</span> 
                              <span className="ml-1">{new Date(painting.auction_end).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {painting.image_url && (
                        <div className="flex justify-center items-center">
                          <img
                            src={painting.image_url}
                            alt={painting.title}
                            className="w-full h-80 object-cover rounded-lg border border-gray-200 shadow-sm"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {loadingAuction ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center gap-3 text-slate-600">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                      <span>Loading auction data...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Highest Bidder Display */}
                    {highestBid && (
                      <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-6 mb-8">
                        <div className="text-center">
                          <h3 className="text-xl font-bold text-emerald-800 mb-2">🏆 Current Highest Bidder</h3>
                          <div className="text-3xl font-bold text-emerald-600 mb-2">
                            {highestBid.bidder_name}
                          </div>
                          <div className="text-2xl font-semibold text-emerald-700 mb-2">
                            {new Intl.NumberFormat('en-MW', {
                              style: 'currency',
                              currency: 'MWK',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(highestBid.bid_amount)}
                          </div>
                          <div className="text-sm text-emerald-600">
                            Bid placed: {new Date(highestBid.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                        <div className="text-2xl font-bold text-emerald-600">{totalBidders}</div>
                        <div className="text-sm text-gray-600">Total Bidders</div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                        <div className="text-2xl font-bold text-blue-600">{auctionBids.length}</div>
                        <div className="text-sm text-gray-600">Total Bids</div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {highestBid ? new Intl.NumberFormat('en-MW', {
                            style: 'currency',
                            currency: 'MWK',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(highestBid.bid_amount) : 'MK0'}
                        </div>
                        <div className="text-sm text-gray-600">Highest Bid</div>
                      </div>
                    </div>

                  </>
                )}
              </div>
            )}

            {/* Admin Settings Tab Content */}
            {activeTab === 'admin-settings' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Settings</h2>
                  <p className="text-slate-600">Manage system settings and configurations</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Organization Settings */}
                  <div className="bg-white border border-slate-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Organization Settings
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Organization Name
                        </label>
                        <input
                          type="text"
                          value={organizationSettings.organization_name || ''}
                          onChange={(e) => setOrganizationSettings(prev => ({
                            ...prev,
                            organization_name: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter organization name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Event Date
                        </label>
                        <input
                          type="date"
                          value={organizationSettings.event_date || ''}
                          onChange={(e) => setOrganizationSettings(prev => ({
                            ...prev,
                            event_date: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Contact Email
                        </label>
                        <input
                          type="email"
                          value={organizationSettings.contact_email || ''}
                          onChange={(e) => setOrganizationSettings(prev => ({
                            ...prev,
                            contact_email: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="contact@organization.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Contact Phone
                        </label>
                        <input
                          type="tel"
                          value={organizationSettings.contact_phone || ''}
                          onChange={(e) => setOrganizationSettings(prev => ({
                            ...prev,
                            contact_phone: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="+27 82 123 4567"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Organization Logo
                        </label>
                        
                        {/* Current Logo Display */}
                        {organizationSettings.organization_logo_url && (
                          <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-sm text-slate-600 block mb-2">Current Logo:</span>
                            <img 
                              src={organizationSettings.organization_logo_url} 
                              alt="Current organization logo"
                              className="h-16 w-auto object-contain mx-auto"
                            />
                          </div>
                        )}
                        
                        {/* Logo Upload Input */}
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            id="org-logo-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleOrganizationLogoUpload}
                            className="flex-1 text-sm text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('org-logo-upload').click()}
                            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Browse
                          </button>
                        </div>
                        
                        {/* Upload Preview */}
                        {organizationLogoUpload && (
                          <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-slate-600">Preview:</span>
                              <button
                                type="button"
                                onClick={removeOrganizationLogo}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Remove
                              </button>
                            </div>
                            <img 
                              src={URL.createObjectURL(organizationLogoUpload)} 
                              alt="Logo preview"
                              className="h-16 w-auto object-contain mx-auto"
                            />
                          </div>
                        )}
                        
                        {/* Save Logo Button */}
                        {organizationLogoUpload && (
                          <button
                            onClick={saveOrganizationLogo}
                            className="w-full mb-3 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Save Organization Logo
                          </button>
                        )}
                        
                        <p className="text-xs text-slate-500">
                          Recommended: 480x160px, PNG format with transparent background
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        try {
                          // Save organization settings to database
                          for (const [key, value] of Object.entries(organizationSettings)) {
                            if (value) {
                              await db.updateOrganizationSetting(key, value);
                            }
                          }
                          alert('Organization settings saved successfully!');
                        } catch (err) {
                          console.error('Error saving organization settings:', err);
                          alert('Failed to save settings. Please try again.');
                        }
                      }}
                      className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save Organization Settings
                    </button>
                  </div>

                  {/* System Settings */}
                  <div className="bg-white border border-slate-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      System Settings
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-slate-900">Admin Mode</h4>
                          <p className="text-sm text-slate-600">Currently {isAdminMode ? 'enabled' : 'disabled'}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          isAdminMode 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isAdminMode ? 'Active' : 'Inactive'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-slate-900">Database Connection</h4>
                          <p className="text-sm text-slate-600">Supabase connection status</p>
                        </div>
                        <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Connected
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-slate-900">Real-time Updates</h4>
                          <p className="text-sm text-slate-600">Live auction updates enabled</p>
                        </div>
                        <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Enabled
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <button
                        onClick={loadData}
                        className="w-full flex items-center justify-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Refresh Data
                      </button>
                      
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to clear all cached data?')) {
                            // Clear local state and reload
                            setEvents([]);
                            setRaffleItems([]);
                            setAuctionBids([]);
                            loadData();
                            alert('Cache cleared and data refreshed!');
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear Cache
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => {
                        const content = generatePDFContent();
                        const blob = new Blob([content], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'Charity_Golf_Day_Itinerary.html';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export Itinerary
                    </button>

                    <button
                      onClick={() => {
                        const auctionData = {
                          painting,
                          bids: auctionBids,
                          highestBid,
                          totalBidders
                        };
                        const blob = new Blob([JSON.stringify(auctionData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'auction_data.json';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export Auction Data
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to exit admin mode?')) {
                          handleAdminLogout();
                        }
                      }}
                      className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Lock className="w-4 h-4" />
                      Exit Admin Mode
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {editingEventIndex >= 0 ? 'Edit Event' : 'Add New Event'}
              </h3>
              <button onClick={() => setShowEventModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <input
                  type="time"
                  value={editingEvent?.time || ''}
                  onChange={(e) => setEditingEvent({...editingEvent, time: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Event Type</label>
                <select
                  value={editingEvent?.eventType || ''}
                  onChange={(e) => setEditingEvent({...editingEvent, eventType: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {eventTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={editingEvent?.title || ''}
                onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Event title"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={editingEvent?.description || ''}
                onChange={(e) => setEditingEvent({...editingEvent, description: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Event description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={editingEvent?.location || ''}
                  onChange={(e) => setEditingEvent({...editingEvent, location: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Event location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Participants</label>
                <input
                  type="text"
                  value={editingEvent?.participants || ''}
                  onChange={(e) => setEditingEvent({...editingEvent, participants: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Who can participate"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Icon</label>
                <select
                  value={editingEvent?.icon || ''}
                  onChange={(e) => setEditingEvent({...editingEvent, icon: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Coffee">Coffee</option>
                  <option value="MapPin">MapPin</option>
                  <option value="Trophy">Trophy</option>
                  <option value="Users">Users</option>
                  <option value="Camera">Camera</option>
                  <option value="Gift">Gift</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Color Theme</label>
                <select
                  value={editingEvent?.color || ''}
                  onChange={(e) => setEditingEvent({...editingEvent, color: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {colorOptions.map(color => (
                    <option key={color} value={color}>{color.charAt(0).toUpperCase() + color.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Additional Information</label>
              <textarea
                value={editingEvent?.additionalInfo || ''}
                onChange={(e) => setEditingEvent({...editingEvent, additionalInfo: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Detailed information about the event"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Contact Person</label>
                <input
                  type="text"
                  value={editingEvent?.contactPerson || ''}
                  onChange={(e) => setEditingEvent({...editingEvent, contactPerson: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Contact Phone</label>
                <input
                  type="text"
                  value={editingEvent?.contactPhone || ''}
                  onChange={(e) => setEditingEvent({...editingEvent, contactPhone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contact phone number"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Special Notes</label>
              <textarea
                value={editingEvent?.specialNotes || ''}
                onChange={(e) => setEditingEvent({...editingEvent, specialNotes: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="2"
                placeholder="Any special instructions or notes"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveEvent}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Event
              </button>
              <button
                onClick={() => setShowEventModal(false)}
                className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raffle Modal */}
      {showRaffleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {editingRaffleIndex >= 0 ? 'Edit Raffle Prize' : 'Add New Raffle Prize'}
              </h3>
              <button onClick={() => setShowRaffleModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Prize Name</label>
              <input
                type="text"
                value={editingRaffle?.prize || ''}
                onChange={(e) => setEditingRaffle({...editingRaffle, prize: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Prize name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sponsor</label>
                <input
                  type="text"
                  value={editingRaffle?.sponsor || ''}
                  onChange={(e) => setEditingRaffle({...editingRaffle, sponsor: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Sponsor name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Value</label>
                <input
                  type="text"
                  value={editingRaffle?.value || ''}
                  onChange={(e) => setEditingRaffle({...editingRaffle, value: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="$500"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={editingRaffle?.description || ''}
                onChange={(e) => setEditingRaffle({...editingRaffle, description: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-blue-500"
                rows="3"
                placeholder="Prize description"
              />
            </div>

            {/* Logo Upload Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Sponsor Logo</label>
              
              {/* Current Logo Display */}
              {(editingRaffle?.logo_url || logoUploads[editingRaffle?.id]) && (
                <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Current Logo:</span>
                    <button
                      type="button"
                      onClick={() => removeLogo(editingRaffle.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                  <img 
                    src={logoUploads[editingRaffle.id] ? URL.createObjectURL(logoUploads[editingRaffle.id]) : editingRaffle.logo_url} 
                    alt="Current logo"
                    className="h-16 w-auto object-contain rounded"
                  />
                </div>
              )}
              
              {/* Logo Upload Input */}
              <div className="flex items-center gap-3">
                <input
                  id={`logo-upload-${editingRaffle.id}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, editingRaffle.id)}
                  className="flex-1 text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById(`logo-upload-${editingRaffle.id}`).click()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  Browse
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Recommended: 120x60px, PNG or JPG format
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveRaffle}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Prize
              </button>
              <button
                onClick={() => setShowRaffleModal(false)}
                className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Painting Modal */}
      {showPaintingModal && editingPainting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Edit Painting Details</h3>
              <button onClick={() => setShowPaintingModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={editingPainting.title || ''}
                    onChange={(e) => setEditingPainting({...editingPainting, title: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Painting title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Artist</label>
                  <input
                    type="text"
                    value={editingPainting.artist || ''}
                    onChange={(e) => setEditingPainting({...editingPainting, artist: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Artist name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Year</label>
                    <input
                      type="number"
                      value={editingPainting.year || ''}
                      onChange={(e) => setEditingPainting({...editingPainting, year: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Year"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Medium</label>
                    <input
                      type="text"
                      value={editingPainting.medium || ''}
                      onChange={(e) => setEditingPainting({...editingPainting, medium: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Oil on canvas"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Dimensions</label>
                  <input
                    type="text"
                    value={editingPainting.dimensions || ''}
                    onChange={(e) => setEditingPainting({...editingPainting, dimensions: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="60cm x 80cm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Condition</label>
                  <select
                    value={editingPainting.condition || ''}
                    onChange={(e) => setEditingPainting({...editingPainting, condition: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select condition</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Very Good">Very Good</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={editingPainting.description || ''}
                    onChange={(e) => setEditingPainting({...editingPainting, description: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24"
                    placeholder="Painting description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Image URL</label>
                  <input
                    type="url"
                    value={editingPainting.image_url || ''}
                    onChange={(e) => setEditingPainting({...editingPainting, image_url: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Starting Bid (MWK)</label>
                    <input
                      type="number"
                      value={editingPainting.starting_bid || ''}
                      onChange={(e) => setEditingPainting({...editingPainting, starting_bid: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Estimated Value (MWK)</label>
                    <input
                      type="number"
                      value={editingPainting.estimated_value || ''}
                      onChange={(e) => setEditingPainting({...editingPainting, estimated_value: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="5000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Provenance</label>
                  <textarea
                    value={editingPainting.provenance || ''}
                    onChange={(e) => setEditingPainting({...editingPainting, provenance: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20"
                    placeholder="History of ownership"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Auction End Date</label>
                  <input
                    type="datetime-local"
                    value={editingPainting.auction_end ? new Date(editingPainting.auction_end).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditingPainting({...editingPainting, auction_end: e.target.value ? new Date(e.target.value).toISOString() : null})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={savePainting}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              <button
                onClick={() => setShowPaintingModal(false)}
                className="flex-1 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-12 p-8 bg-white rounded-xl shadow-sm border border-slate-200 max-w-4xl mx-auto">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Have a successful day on the course</h3>
        <p className="text-slate-600 text-sm">Professional tournament schedule • All times are approximate</p>
        {isAdminMode && (
          <p className="text-green-600 text-xs mt-2 font-semibold">✓ Admin Mode Active - Events can be modified</p>
        )}
        
        {/* Admin Controls - Moved to Bottom */}
        <div className="mt-6 flex justify-center gap-3">
          {onNavigateToAuction && (
            <button
              onClick={onNavigateToAuction}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors"
            >
              <Gavel className="w-4 h-4" />
              Live Auction
            </button>
          )}
          {!isAdminMode ? (
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Admin
            </button>
          ) : (
            <button
              onClick={() => setIsAdminMode(false)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-green-700 transition-colors"
            >
              <Unlock className="w-4 h-4" />
              Exit Admin
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GolfEventManager;

