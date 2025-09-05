import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Gavel, Clock, User, DollarSign, Heart, Share2, Flag, Calendar, MapPin, Mail, Phone, Loader2, AlertCircle, CheckCircle, TrendingUp, Shield, Lock } from 'lucide-react';
import { supabase, db } from '../lib/supabase';

const AuctionBidding = () => {
  const navigate = useNavigate();
  const { paintingId } = useParams();
  const actualPaintingId = paintingId ? parseInt(paintingId) : 1;
  const [painting, setPainting] = useState(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [bidHistory, setBidHistory] = useState([]);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isAuctionEnded, setIsAuctionEnded] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [bidAnimation, setBidAnimation] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(null);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  
  // Tab system state
  const [activeTab, setActiveTab] = useState('new'); // 'new', 'returning', or 'your-bids'
  const [returningBidder, setReturningBidder] = useState(null);
  const [searchingBidder, setSearchingBidder] = useState(false);
  const [bidderNotFound, setBidderNotFound] = useState(false);
  
  // Your Bids tab state
  const [currentBidder, setCurrentBidder] = useState(null);
  const [personalBids, setPersonalBids] = useState([]);
  const [loadingPersonalBids, setLoadingPersonalBids] = useState(false);

  // Session persistence helpers
  const saveBidderSession = useCallback((bidder) => {
    if (bidder) {
      localStorage.setItem('auction_bidder_session', JSON.stringify(bidder));
    } else {
      localStorage.removeItem('auction_bidder_session');
    }
  }, []);

  const loadBidderSession = useCallback(() => {
    try {
      const savedSession = localStorage.getItem('auction_bidder_session');
      if (savedSession) {
        const bidder = JSON.parse(savedSession);
        return bidder;
      }
    } catch (error) {
      console.error('Error loading bidder session:', error);
      localStorage.removeItem('auction_bidder_session');
    }
    return null;
  }, []);

  const clearBidderSession = useCallback(() => {
    localStorage.removeItem('auction_bidder_session');
    setCurrentBidder(null);
  }, []);
  
  // Form state
  const [bidAmount, setBidAmount] = useState('');
  const [bidderName, setBidderName] = useState('');
  const [bidderEmail, setBidderEmail] = useState('');
  const [bidderPhone, setBidderPhone] = useState('');
  
  // Returning bidder form state
  const [returningEmail, setReturningEmail] = useState('');
  const [returningPhone, setReturningPhone] = useState('');

  // Constants
  const MIN_BID_INCREMENT = 100000; // 100K MWK minimum increment
  const BID_ANIMATION_DURATION = 1000;
  const RATE_LIMIT_WINDOW = 60000; // 1 minute
  const MAX_SUBMISSIONS_PER_WINDOW = 3;
  const MAX_BID_AMOUNT = 10000000; // 10M MWK max bid
  const MIN_BID_AMOUNT = 1;

  // Check if user is the highest bidder or has been outbid
  const isHighestBidder = currentBidder && personalBids.length > 0 && personalBids[0]?.bid_amount === currentBid;
  const hasBeenOutbid = currentBidder && personalBids.length > 0 && personalBids[0]?.bid_amount < currentBid;

  // Security and validation utilities
  const sanitizeInput = useCallback((input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }, []);

  const validateEmail = useCallback((email) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  }, []);

  const validatePhone = useCallback((phone) => {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    return phoneRegex.test(phone) && cleanPhone.length >= 10;
  }, []);

  const formatPhoneNumber = useCallback((value) => {
    // Remove all non-digit characters and return the raw phone number
    return value.replace(/\D/g, '');
  }, []);

  const formatCurrencyInput = useCallback((value) => {
    const numericValue = value.replace(/[^\d.]/g, '');
    if (numericValue === '') return '';
    const number = parseFloat(numericValue);
    if (isNaN(number)) return '';
    return number.toFixed(0);
  }, []);

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const timeSinceLastSubmission = now - lastSubmissionTime;
    
    if (timeSinceLastSubmission < RATE_LIMIT_WINDOW) {
      if (submissionCount >= MAX_SUBMISSIONS_PER_WINDOW) {
        const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - timeSinceLastSubmission) / 1000);
        setRateLimitError(`Rate limit exceeded. Please wait ${remainingTime} seconds before submitting another bid.`);
        return false;
      }
    } else {
      // Reset counter if outside the window
      setSubmissionCount(0);
    }
    
    setRateLimitError(null);
    return true;
  }, [lastSubmissionTime, submissionCount]);

  // Load painting data and initial bids
  useEffect(() => {
    loadPaintingData();
    loadBidHistory();
    setupRealtimeSubscription();
    
    // Restore bidder session from localStorage
    const savedBidder = loadBidderSession();
    if (savedBidder) {
      setCurrentBidder(savedBidder);
      setActiveTab('your-bids');
      // Load personal bids for the restored bidder
      loadPersonalBids(savedBidder.bidder_email, savedBidder.bidder_phone);
    }
    
    // Fallback polling mechanism in case real-time doesn't work
    const pollInterval = setInterval(async () => {
      // Don't poll if auction has ended
      if (isAuctionEnded) return;
      
      try {
        const highestBid = await db.getHighestBid(actualPaintingId);
        if (highestBid && highestBid.bid_amount > currentBid) {
          console.log('Polling detected new highest bid:', highestBid.bid_amount);
          setCurrentBid(highestBid.bid_amount);
          setBidAnimation(true);
          setTimeout(() => setBidAnimation(false), BID_ANIMATION_DURATION);
        }
      } catch (error) {
        console.error('Error in polling check:', error);
      }
    }, 5000); // Check every 5 seconds
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [actualPaintingId, currentBid, loadBidderSession, isAuctionEnded]);

  // Countdown timer
  useEffect(() => {
    if (!painting?.auction_end) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      
      // For Johannesburg time zone (UTC+2), we need to handle the timezone conversion
      // If the auction_end is stored in UTC but should be interpreted as Johannesburg time
      let endTime;
      
      if (painting.auction_end.endsWith('Z')) {
        // The time is stored in UTC, but we want to treat it as Johannesburg local time
        // So we need to convert from UTC to Johannesburg time
        // Johannesburg is UTC+2, so we add 2 hours to the UTC time
        const utcTime = new Date(painting.auction_end).getTime();
        const johannesburgOffset = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        endTime = utcTime + johannesburgOffset;
      } else {
        // If it's already in local time format, use it as is
        endTime = new Date(painting.auction_end).getTime();
      }
      
      const distance = endTime - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
        setIsAuctionEnded(false);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsAuctionEnded(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [painting?.auction_end]);

  const loadPaintingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading painting data for ID:', actualPaintingId);
      const paintingData = await db.getPainting(actualPaintingId);
      console.log('Painting data loaded:', paintingData);
      setPainting(paintingData);
      
      // Get the highest bid
      const highestBid = await db.getHighestBid(actualPaintingId);
      console.log('Highest bid loaded:', highestBid);
      setCurrentBid(highestBid ? highestBid.bid_amount : paintingData.starting_bid);
      
    } catch (err) {
      console.error('Error loading painting:', err);
      setError('Failed to load painting data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadBidHistory = async () => {
    try {
      console.log('Loading bid history for painting ID:', actualPaintingId);
      const bids = await db.getBidHistory(actualPaintingId, 10);
      console.log('Bid history loaded:', bids);
      setBidHistory(bids);
    } catch (err) {
      console.error('Error loading bid history:', err);
    }
  };

  const loadPersonalBids = async (bidderEmail, bidderPhone) => {
    try {
      setLoadingPersonalBids(true);
      const bids = await db.getBidsByBidder(actualPaintingId, bidderEmail, bidderPhone);
      setPersonalBids(bids);
    } catch (err) {
      console.error('Error loading personal bids:', err);
      setError('Failed to load your bids. Please try again.');
    } finally {
      setLoadingPersonalBids(false);
    }
  };

  const handlePersonalBidSubmit = async (e) => {
    e.preventDefault();
    
    // Check if auction has ended
    if (isAuctionEnded) {
      setError('❌ This auction has ended. No more bids can be placed.');
      return;
    }
    
    if (!currentBidder) {
      setError('Please identify yourself first');
      return;
    }

    if (!checkRateLimit()) return;

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmittingBid(true);
    setError(null);
    setFormErrors({});

    try {
      const bidData = {
        painting_id: actualPaintingId,
        bidder_name: currentBidder.bidder_name,
        bidder_email: currentBidder.bidder_email,
        bidder_phone: currentBidder.bidder_phone,
        bid_amount: parseFloat(bidAmount)
      };

      await db.submitBid(bidData);
      
      setSuccess('Bid submitted successfully!');
      setBidAmount('');
      setLastSubmissionTime(Date.now());
      setSubmissionCount(prev => prev + 1);
      
      // Reload data
      await Promise.all([
        loadPaintingData(),
        loadBidHistory(),
        loadPersonalBids(currentBidder.bidder_email, currentBidder.bidder_phone)
      ]);
      
      // Trigger animation
      setBidAnimation(true);
      setTimeout(() => setBidAnimation(false), BID_ANIMATION_DURATION);
      
    } catch (err) {
      console.error('Error submitting bid:', err);
      setError('Failed to submit bid. Please try again.');
    } finally {
      setSubmittingBid(false);
    }
  };

  // Enhanced form validation with security checks
  const validateForm = useCallback(() => {
    const errors = {};
    
    // Sanitize inputs first
    const sanitizedName = sanitizeInput(bidderName);
    const sanitizedEmail = sanitizeInput(bidderEmail);
    const sanitizedPhone = sanitizeInput(bidderPhone);
    const sanitizedAmount = sanitizeInput(bidAmount);
    
    // Validate bidder name
    if (!sanitizedName) {
      errors.bidderName = 'Name is required';
    } else if (sanitizedName.length < 2) {
      errors.bidderName = 'Name must be at least 2 characters';
    } else if (sanitizedName.length > 100) {
      errors.bidderName = 'Name must be less than 100 characters';
    } else if (!/^[a-zA-Z\s\-'\.]+$/.test(sanitizedName)) {
      errors.bidderName = 'Name can only contain letters, spaces, hyphens, apostrophes, and periods';
    }
    
    // Validate bid amount
    if (!sanitizedAmount) {
      errors.bidAmount = 'Bid amount is required';
    } else {
      const bidValue = parseFloat(sanitizedAmount);
      if (isNaN(bidValue) || bidValue <= 0) {
        errors.bidAmount = 'Please enter a valid bid amount';
      } else if (bidValue < MIN_BID_AMOUNT) {
        errors.bidAmount = `Minimum bid amount is ${formatCurrency(MIN_BID_AMOUNT)}`;
      } else if (bidValue > MAX_BID_AMOUNT) {
        errors.bidAmount = `Maximum bid amount is ${formatCurrency(MAX_BID_AMOUNT)}`;
      } else if (bidValue <= currentBid) {
        errors.bidAmount = `Bid must be higher than current bid of ${formatCurrency(currentBid)}`;
      } else if (bidValue < currentBid + MIN_BID_INCREMENT) {
        errors.bidAmount = `Minimum bid increment is ${formatCurrency(MIN_BID_INCREMENT)}`;
      } else if (!Number.isInteger(bidValue)) {
        errors.bidAmount = 'Bid amount must be a whole number';
      }
    }
    
    // Validate email (required)
    if (!sanitizedEmail) {
      errors.bidderEmail = 'Email address is required';
    } else if (!validateEmail(sanitizedEmail)) {
      errors.bidderEmail = 'Please enter a valid email address (e.g., john@example.com)';
      } else if (sanitizedEmail.length > 254) {
        errors.bidderEmail = 'Email address is too long';
    }
    
    // Validate phone (required)
    if (!sanitizedPhone) {
      errors.bidderPhone = 'Phone number is required';
    } else if (!validatePhone(sanitizedPhone)) {
        errors.bidderPhone = 'Please enter a valid phone number (10-15 digits)';
    }
    
    // Check for duplicate bids (client-side check)
    const bidValue = parseFloat(sanitizedAmount);
    if (!isNaN(bidValue) && bidHistory.some(bid => bid.bid_amount === bidValue)) {
      errors.bidAmount = 'A bid with this exact amount already exists. Please try a different amount.';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [bidderName, bidderEmail, bidderPhone, bidAmount, currentBid, bidHistory, sanitizeInput, validateEmail, validatePhone]);

  const clearFormErrors = () => {
    setFormErrors({});
  };

  // Search for returning bidder
  const searchReturningBidder = async () => {
    if (!returningEmail.trim() && !returningPhone.trim()) {
      setBidderNotFound(true);
      return;
    }

    try {
      setSearchingBidder(true);
      setBidderNotFound(false);
      setReturningBidder(null);

      console.log('Searching for returning bidder with email:', returningEmail, 'phone:', returningPhone, 'painting ID:', actualPaintingId);

      let query = supabase
        .from('bids')
        .select('bidder_name, bidder_email, bidder_phone')
        .eq('painting_id', actualPaintingId);

      if (returningEmail.trim()) {
        query = query.eq('bidder_email', returningEmail.trim());
      } else if (returningPhone.trim()) {
        query = query.eq('bidder_phone', returningPhone.trim());
      }

      const { data, error } = await query.limit(1).single();

      console.log('Returning bidder search result:', { data, error });

      if (error || !data) {
        setBidderNotFound(true);
        setReturningBidder(null);
      } else {
        setReturningBidder(data);
        setBidderNotFound(false);
        
        // Set current bidder and switch to "Your Bids" tab
        setCurrentBidder(data);
        saveBidderSession(data);
        setActiveTab('your-bids');
        
        // Load personal bids for the returning bidder
        loadPersonalBids(data.bidder_email, data.bidder_phone);
      }
    } catch (err) {
      console.error('Error searching for bidder:', err);
      setBidderNotFound(true);
      setReturningBidder(null);
    } finally {
      setSearchingBidder(false);
    }
  };

  // Reset returning bidder form
  const resetReturningBidderForm = () => {
    setReturningEmail('');
    setReturningPhone('');
    setReturningBidder(null);
    setBidderNotFound(false);
    setBidAmount('');
  };

  // Check if new bidder already exists in database
  const checkExistingBidder = async (email, phone) => {
    if (!email.trim() && !phone.trim()) return null;

    try {
      let query = supabase
        .from('bids')
        .select('bidder_name, bidder_email, bidder_phone')
        .eq('painting_id', paintingId);

      if (email.trim()) {
        query = query.eq('bidder_email', email.trim());
      } else if (phone.trim()) {
        query = query.eq('bidder_phone', phone.trim());
      }

      const { data, error } = await query.limit(1).single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.error('Error checking existing bidder:', err);
    }
    
    return null;
  };

  // Debounced check for existing bidder
  const debouncedCheckBidder = useCallback(
    debounce(async (email, phone) => {
      const existingBidder = await checkExistingBidder(email, phone);
      if (existingBidder) {
        setReturningBidder(existingBidder);
        if (email.trim()) {
          setReturningEmail(email);
        } else if (phone.trim()) {
          setReturningPhone(phone);
        }
        setActiveTab('returning');
        setSuccess(`Welcome back ${existingBidder.bidder_name}! We found your previous bid.`);
        setTimeout(() => setSuccess(null), 5000);
      }
    }, 1000),
    [paintingId]
  );

  // Simple debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const setupRealtimeSubscription = () => {
    console.log('Setting up real-time subscription for painting:', actualPaintingId);
    
    const channel = supabase
      .channel(`bids_changes_${actualPaintingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `painting_id=eq.${actualPaintingId}`
        },
        (payload) => {
          console.log('New bid received via real-time:', payload);
          const newBid = payload.new;
          
          // Don't process new bids if auction has ended
          if (isAuctionEnded) {
            console.log('Auction has ended, ignoring new bid');
            return;
          }
          
          // Animate bid update
          setBidAnimation(true);
          setTimeout(() => setBidAnimation(false), BID_ANIMATION_DURATION);
          
          // Update current bid immediately if higher
          setCurrentBid(prevBid => {
            console.log('Updating current bid from', prevBid, 'to', newBid.bid_amount);
            if (newBid.bid_amount > prevBid) {
              return newBid.bid_amount;
            }
            return prevBid;
          });
          
          // Add to bid history
          setBidHistory(prev => [newBid, ...prev.slice(0, 9)]);
          
          // Refresh personal bids if we have a current bidder
          if (currentBidder) {
            loadPersonalBids(currentBidder.bidder_email, currentBidder.bidder_phone);
          }
          
          // Show success message
          setSuccess(`New bid of ${formatCurrency(newBid.bid_amount)} from ${newBid.bidder_name}!`);
          setTimeout(() => setSuccess(null), 5000);
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    
    // Check if auction has ended
    if (isAuctionEnded) {
      setError('❌ This auction has ended. No more bids can be placed.');
      return;
    }
    
    // Prevent duplicate submissions
    if (isProcessing || submittingBid) {
      return;
    }

    // Clear previous errors
    setError(null);
    setSuccess(null);
    setRateLimitError(null);
    clearFormErrors();

    // Check rate limiting
    if (!checkRateLimit()) {
      return;
    }

    // Validate form
    if (!validateForm()) {
      setError('Please correct the errors below and try again.');
      return;
    }

    try {
      setIsProcessing(true);
      setSubmittingBid(true);

      // Sanitize all inputs before sending to server
      const sanitizedBidData = {
        bidder_name: sanitizeInput(bidderName.trim()),
        bidder_email: sanitizeInput(bidderEmail.trim()),
        bidder_phone: sanitizeInput(bidderPhone.trim()),
        bid_amount: parseFloat(sanitizeInput(bidAmount)),
        painting_id: actualPaintingId
      };

      console.log('Submitting bid with data:', sanitizedBidData);

      // Additional server-side validation
      if (sanitizedBidData.bid_amount <= currentBid) {
        throw new Error('Bid amount must be higher than current bid');
      }

      if (sanitizedBidData.bid_amount < currentBid + MIN_BID_INCREMENT) {
        throw new Error('Bid amount must meet minimum increment requirement');
      }

      const newBid = await db.createBid(sanitizedBidData);
      
      // Update rate limiting
      setLastSubmissionTime(Date.now());
      setSubmissionCount(prev => prev + 1);
      
      // Immediately update current bid locally
      setCurrentBid(sanitizedBidData.bid_amount);
      
      // Animate the bid update
      setBidAnimation(true);
      setTimeout(() => setBidAnimation(false), BID_ANIMATION_DURATION);
      
      // Add to bid history immediately
      setBidHistory(prev => [newBid, ...prev.slice(0, 9)]);
      
      // Refresh data from database to ensure accuracy (in background)
      loadPaintingData();
      loadBidHistory();
      
      // Clear form
      setBidAmount('');
      setBidderName('');
      setBidderEmail('');
      setBidderPhone('');
      
      // Set current bidder for "Your Bids" tab
      const newBidder = {
        bidder_name: sanitizedBidData.bidder_name,
        bidder_email: sanitizedBidData.bidder_email,
        bidder_phone: sanitizedBidData.bidder_phone
      };
      setCurrentBidder(newBidder);
      saveBidderSession(newBidder);
      
      // Show success message
      setSuccess(`🎉 Congratulations! Your bid of ${formatCurrency(sanitizedBidData.bid_amount)} has been submitted successfully! You are now the highest bidder.`);
      setTimeout(() => setSuccess(null), 10000);
      
    } catch (err) {
      console.error('Error submitting bid:', err);
      
      // Handle specific error types with detailed messages
      if (err.message?.includes('duplicate') || err.message?.includes('already exists')) {
        setError('❌ A bid with this exact amount already exists. Please try a different amount.');
      } else if (err.message?.includes('validation') || err.message?.includes('invalid')) {
        setError('❌ Invalid bid data. Please check your input and try again.');
      } else if (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('connection')) {
        setError('❌ Network error. Please check your internet connection and try again.');
      } else if (err.message?.includes('rate limit') || err.message?.includes('too many')) {
        setError('❌ Too many requests. Please wait a moment before submitting another bid.');
      } else if (err.message?.includes('higher than current bid')) {
        setError(`❌ Bid must be higher than current bid of ${formatCurrency(currentBid)}.`);
      } else if (err.message?.includes('minimum increment')) {
        setError(`❌ Bid must be at least ${formatCurrency(MIN_BID_INCREMENT)} higher than current bid.`);
      } else {
        setError('❌ Failed to submit bid. Please try again or contact support if the problem persists.');
      }
    } finally {
      setIsProcessing(false);
      setSubmittingBid(false);
    }
  };

  // Simplified bid submission for returning bidders

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MW', {
      style: 'currency',
      currency: 'MWK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  const formatAuctionEndTime = (auctionEndString) => {
    if (!auctionEndString) return 'Not set';
    
    let endTime;
    if (auctionEndString.endsWith('Z')) {
      // Convert from UTC to Johannesburg time (UTC+2)
      const utcTime = new Date(auctionEndString).getTime();
      const johannesburgOffset = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
      endTime = new Date(utcTime + johannesburgOffset);
    } else {
      endTime = new Date(auctionEndString);
    }
    
    return endTime.toLocaleString('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading auction data...</p>
        </div>
      </div>
    );
  }

  if (!painting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Painting not found</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
          >
            ← Back to Golf Itinerary
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Back to Golf Itinerary</span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <Calendar className="h-4 w-4 inline mr-1" />
                6th September 2025
              </div>
              {painting?.auction_end && (
                <div className="text-sm text-emerald-600">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Ends: {formatAuctionEndTime(painting.auction_end)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {rateLimitError && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center space-x-2">
            <Lock className="h-5 w-5 text-yellow-500" />
            <p className="text-yellow-700">{rateLimitError}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Painting Image */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="aspect-[4/3] relative">
                <img
                  src={painting.image_url}
                  alt={painting.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setIsWatching(!isWatching)}
                    className={`p-2 rounded-full transition-colors ${
                      isWatching 
                        ? 'bg-red-500 text-white' 
                        : 'bg-white/90 text-gray-600 hover:bg-white'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${isWatching ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Painting Details */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{painting.title}</h2>
              <p className="text-lg text-emerald-600 font-medium mb-4">by {painting.artist}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Year:</span>
                  <span className="ml-2 font-medium">{painting.year}</span>
                </div>
                <div>
                  <span className="text-gray-500">Medium:</span>
                  <span className="ml-2 font-medium">{painting.medium}</span>
                </div>
                <div>
                  <span className="text-gray-500">Dimensions:</span>
                  <span className="ml-2 font-medium">{painting.dimensions}</span>
                </div>
                <div>
                  <span className="text-gray-500">Condition:</span>
                  <span className="ml-2 font-medium text-green-600">{painting.condition}</span>
                </div>
              </div>
              
              {/* Auction End Time */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-gray-500">Auction Ends:</span>
                  <span className="text-sm font-medium text-emerald-600">
                    {formatAuctionEndTime(painting.auction_end)}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Johannesburg Time (SAST)
                </div>
              </div>
            </div>
          </div>

          {/* Bidding Section */}
          <div className="space-y-6">
            {/* Current Bid */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Current Bid</h3>
                <div className={`flex items-center space-x-2 ${
                  isAuctionEnded ? 'text-gray-600' : 'text-emerald-600'
                }`}>
                  {isAuctionEnded ? (
                    <>
                      <Flag className="h-5 w-5" />
                      <span className="font-medium">Auction Ended</span>
                    </>
                  ) : (
                    <>
                  <Gavel className="h-5 w-5" />
                  <span className="font-medium">Live Auction</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="text-center mb-6">
                <div className={`text-4xl font-bold mb-2 transition-all duration-1000 ${
                  bidAnimation ? 'scale-110' : 'scale-100'
                } ${
                  isAuctionEnded ? 'text-gray-600' : hasBeenOutbid ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {formatCurrency(currentBid)}
                </div>
                {isAuctionEnded && (
                  <div className="text-lg font-semibold text-gray-600 mb-2">
                    🏁 Auction Ended - Final Bid
                  </div>
                )}
                {bidAnimation && (
                  <div className="flex items-center justify-center space-x-1 text-emerald-500 mb-2 animate-pulse">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">New High Bid!</span>
                  </div>
                )}
                {hasBeenOutbid && (
                  <div className="flex items-center justify-center space-x-1 text-red-600 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">You have been outbid!</span>
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  Starting bid: {formatCurrency(painting.starting_bid)}
                </div>
                <div className="text-sm text-gray-500">
                  Est. value: {painting.estimated_value}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Minimum increment: {formatCurrency(MIN_BID_INCREMENT)}
                </div>
              </div>

              {/* Countdown Timer */}
              <div className={`rounded-xl p-4 mb-6 ${
                isAuctionEnded 
                  ? 'bg-gradient-to-r from-gray-100 to-gray-200' 
                  : 'bg-gradient-to-r from-emerald-50 to-amber-50'
              }`}>
                {isAuctionEnded ? (
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <Flag className="h-5 w-5 text-gray-600" />
                      <span className="font-medium text-gray-900">Auction Has Ended</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Thank you for participating in this auction!
                    </div>
                  </div>
                ) : (
                  <>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-gray-900">Auction Ends In:</span>
                </div>
                <div className="flex justify-center space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{timeLeft.days}</div>
                    <div className="text-xs text-gray-500">Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{timeLeft.hours}</div>
                    <div className="text-xs text-gray-500">Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{timeLeft.minutes}</div>
                    <div className="text-xs text-gray-500">Minutes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{timeLeft.seconds}</div>
                    <div className="text-xs text-gray-500">Seconds</div>
                  </div>
                </div>
                  </>
                )}
              </div>

              {/* Welcome Card - Only show if user has placed a bid */}
              {currentBidder && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-green-800 font-medium">Welcome, {currentBidder.bidder_name}!</p>
                      <p className="text-green-600 text-sm">View your bidding history and place new bids</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Place New Bid Section - Only show if user has placed a bid */}
              {currentBidder && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Place New Bid</h4>
                  <form onSubmit={handlePersonalBidSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Bid Amount *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={bidAmount}
                          onChange={(e) => {
                            const formatted = formatCurrencyInput(e.target.value);
                            setBidAmount(formatted);
                          }}
                          placeholder="Enter bid amount"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                          disabled={submittingBid || isProcessing || isAuctionEnded}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum bid: {formatCurrency(currentBid + MIN_BID_INCREMENT)}
                      </p>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={submittingBid || isProcessing || isAuctionEnded}
                      className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingBid || isProcessing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Submitting Bid...</span>
                        </>
                      ) : isAuctionEnded ? (
                        <>
                          <Flag className="h-5 w-5" />
                          <span>Auction Ended</span>
                        </>
                      ) : (
                        <>
                          <Gavel className="h-5 w-5" />
                          <span>Place New Bid</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Auction Ended Message */}
              {isAuctionEnded && (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Flag className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-gray-800 font-medium">Auction Has Ended</p>
                      <p className="text-gray-600 text-sm">Bidding is no longer available for this auction.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab System */}
              <div className="mb-6">
                <div className="flex border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('new');
                      resetReturningBidderForm();
                    }}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'new'
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    New Bidder
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('returning');
                      setBidderName('');
                      setBidderEmail('');
                      setBidderPhone('');
                      setBidAmount('');
                    }}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'returning'
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Returning Bidder
                  </button>
                  {currentBidder && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('your-bids');
                        loadPersonalBids(currentBidder.bidder_email, currentBidder.bidder_phone);
                      }}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'your-bids'
                          ? 'border-emerald-500 text-emerald-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Your Bids
                    </button>
                  )}
                </div>
              </div>

              {/* Security Notice */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <p className="text-xs text-blue-700">
                  <strong>Secure Bidding:</strong> All data is encrypted and protected. Rate limiting: {MAX_SUBMISSIONS_PER_WINDOW} bids per minute.
                </p>
              </div>

              {/* New Bidder Form */}
              {activeTab === 'new' && (
                <form onSubmit={handleBidSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Bid Amount *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={bidAmount}
                      onChange={(e) => {
                        const formatted = formatCurrencyInput(e.target.value);
                        setBidAmount(formatted);
                        if (formErrors.bidAmount) clearFormErrors();
                      }}
                      placeholder="Enter bid amount"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                        formErrors.bidAmount 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-300'
                      }`}
                      required
                      disabled={submittingBid || isProcessing || isAuctionEnded}
                      maxLength={10}
                    />
                  </div>
                  {formErrors.bidAmount ? (
                    <p className="text-xs text-red-600 mt-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {formErrors.bidAmount}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum bid: {formatCurrency(currentBid + MIN_BID_INCREMENT)} • Maximum: {formatCurrency(MAX_BID_AMOUNT)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={bidderName}
                      onChange={(e) => {
                        const sanitized = sanitizeInput(e.target.value);
                        setBidderName(sanitized);
                        if (formErrors.bidderName) clearFormErrors();
                      }}
                      placeholder="Enter your full name"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                        formErrors.bidderName 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-300'
                      }`}
                      required
                      disabled={submittingBid || isProcessing || isAuctionEnded}
                      maxLength={100}
                      pattern="[a-zA-Z\s\-'\.]+"
                      title="Name can only contain letters, spaces, hyphens, apostrophes, and periods"
                    />
                  </div>
                  {formErrors.bidderName ? (
                    <p className="text-xs text-red-600 mt-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {formErrors.bidderName}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      {bidderName.length}/100 characters
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={bidderEmail}
                      onChange={(e) => {
                        const sanitized = sanitizeInput(e.target.value);
                        setBidderEmail(sanitized);
                        if (formErrors.bidderEmail) clearFormErrors();
                        
                        // Check if this email exists in database (debounced)
                        if (sanitized.trim()) {
                          debouncedCheckBidder(sanitized, '');
                        }
                      }}
                      placeholder="Enter your email address"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                        formErrors.bidderEmail 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-300'
                      }`}
                      disabled={submittingBid || isProcessing || isAuctionEnded}
                      maxLength={254}
                      autoComplete="email"
                      required
                    />
                  </div>
                  {formErrors.bidderEmail ? (
                    <p className="text-xs text-red-600 mt-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {formErrors.bidderEmail}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      We'll use this to notify you about bid updates
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      value={bidderPhone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        setBidderPhone(formatted);
                        if (formErrors.bidderPhone) clearFormErrors();
                        
                        // Check if this phone exists in database (debounced)
                        if (formatted.trim()) {
                          debouncedCheckBidder('', formatted);
                        }
                      }}
                      placeholder="1234567890"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                        formErrors.bidderPhone 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-300'
                      }`}
                      disabled={submittingBid || isProcessing || isAuctionEnded}
                      maxLength={20}
                      autoComplete="tel"
                      required
                    />
                  </div>
                  {formErrors.bidderPhone ? (
                    <p className="text-xs text-red-600 mt-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {formErrors.bidderPhone}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      For urgent bid notifications
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submittingBid || isProcessing || isAuctionEnded}
                  className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
                >
                  {submittingBid || isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Submitting Bid...</span>
                    </>
                  ) : isAuctionEnded ? (
                    <>
                      <Flag className="h-5 w-5" />
                      <span>Auction Ended</span>
                    </>
                  ) : (
                    <>
                      <Gavel className="h-5 w-5" />
                      <span>Place Bid</span>
                    </>
                  )}
                </button>
                
                {(submittingBid || isProcessing) && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Please wait while we process your bid...
                  </p>
                )}
                </form>
              )}

              {/* Returning Bidder Form */}
              {activeTab === 'returning' && (
                <div className="space-y-4">
                  {!returningBidder ? (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Find Your Previous Bid</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="email"
                              value={returningEmail}
                              onChange={(e) => setReturningEmail(e.target.value)}
                              placeholder="Enter your email address"
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                        
                        <div className="text-center text-gray-500 text-sm">OR</div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="tel"
                              value={returningPhone}
                              onChange={(e) => setReturningPhone(e.target.value)}
                              placeholder="Enter your phone number"
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={searchReturningBidder}
                          disabled={searchingBidder || (!returningEmail.trim() && !returningPhone.trim())}
                          className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {searchingBidder ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>Searching...</span>
                            </>
                          ) : (
                            <>
                              <User className="h-5 w-5" />
                              <span>Find My Bids</span>
                            </>
                          )}
                        </button>
                        
                        {bidderNotFound && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700 text-sm">
                              <AlertCircle className="h-4 w-4 inline mr-1" />
                              No previous bids found. Please use the "New Bidder" tab to place your first bid.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="text-green-800 font-medium">Welcome back, {returningBidder.bidder_name}!</p>
                            <p className="text-green-600 text-sm">You have been automatically moved to your bidding area.</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center space-y-4">
                        <p className="text-gray-600">
                          You can now view your bidding history and place new bids in the "Your Bids" tab.
                        </p>
                        
                        <button
                          type="button"
                          onClick={resetReturningBidderForm}
                          className="w-full text-gray-600 py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                          Search for Different Bidder
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Your Bids Tab */}
              {activeTab === 'your-bids' && currentBidder && (
                <div className="space-y-6">

                  {/* Bid Status */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Your Bid Status</h4>
                    <div className="text-center">
                      <div className={`text-3xl font-bold mb-2 ${
                        hasBeenOutbid ? 'text-red-600' : isHighestBidder ? 'text-emerald-600' : 'text-gray-600'
                      }`}>
                        {personalBids.length > 0 ? formatCurrency(personalBids[0]?.bid_amount) : 'No bids yet'}
                      </div>
                      <p className={`text-sm ${
                        hasBeenOutbid ? 'text-red-600' : isHighestBidder ? 'text-emerald-600' : 'text-gray-600'
                      }`}>
                        {hasBeenOutbid 
                          ? "❌ You have been outbid!" 
                          : isHighestBidder 
                            ? "🏆 You are currently the highest bidder!" 
                            : personalBids.length > 0 
                              ? "Someone else is currently leading"
                              : "Place your first bid above"}
                      </p>
                    </div>
                  </div>

                  {/* Your Bidding History */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Bidding History</h4>
                    {loadingPersonalBids ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                        <p className="text-gray-600">Loading your bids...</p>
                      </div>
                    ) : personalBids.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No bids found. Place your first bid above!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {personalBids.map((bid, index) => (
                          <div 
                            key={bid.id} 
                            className={`flex items-center justify-between py-3 px-4 rounded-lg border ${
                              index === 0 && bid.bid_amount === currentBid
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                index === 0 && bid.bid_amount === currentBid
                                  ? 'bg-emerald-200'
                                  : 'bg-gray-200'
                              }`}>
                                <span className={`text-sm font-medium ${
                                  index === 0 && bid.bid_amount === currentBid
                                    ? 'text-emerald-700'
                                    : 'text-gray-700'
                                }`}>
                                  {index + 1}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {formatCurrency(bid.bid_amount)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatTimeAgo(bid.created_at)}
                                </div>
                              </div>
                            </div>
                            {index === 0 && bid.bid_amount === currentBid && (
                              <div className="flex items-center space-x-1 text-emerald-600">
                                <span className="text-sm font-medium">🏆 Leading</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Logout Section */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Account</h4>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-4">
                        Logged in as <span className="font-medium">{currentBidder.bidder_name}</span>
                      </p>
                        <button
                          type="button"
                        onClick={clearBidderSession}
                        className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                        >
                        <User className="h-4 w-4" />
                        <span>Log Out</span>
                        </button>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Painting Description */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">About This Painting</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                {painting.description}
              </p>
              <div className="border-t pt-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Provenance:</span> {painting.provenance}
                </div>
              </div>
            </div>

            {/* Bid History */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Bid History</h3>
              <div className="space-y-3">
                {bidHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No bids yet. Be the first to bid!</p>
                ) : (
                  bidHistory.map((bid, index) => (
                    <div 
                      key={bid.id} 
                      className={`flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 transition-all duration-500 ${
                        index === 0 && bidAnimation ? 'bg-emerald-50 scale-105 shadow-md' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          index === 0 && bidAnimation 
                            ? 'bg-emerald-200' 
                            : 'bg-emerald-100'
                        }`}>
                          <User className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{bid.bidder_name}</div>
                          <div className="text-sm text-gray-500">{formatTimeAgo(bid.created_at)}</div>
                        </div>
                      </div>
                      <div className={`text-lg font-bold transition-all duration-500 ${
                        index === 0 && bidAnimation 
                          ? 'text-emerald-500 scale-110' 
                          : 'text-emerald-600'
                      }`}>
                        {formatCurrency(bid.bid_amount)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionBidding;