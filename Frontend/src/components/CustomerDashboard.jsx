import React, { useEffect, useState, useRef } from "react";
import "./CustomerDashboard.css";

const API = "http://127.0.0.1:8000";
const OPENROUTER_API_KEY = "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"; // Replace with actual API key
const MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

function CustomerDashboard({ setLoggedIn, userEmail }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [showSkincare, setShowSkincare] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDailyTips, setShowDailyTips] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [showRoutineGenerator, setShowRoutineGenerator] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [routineRows, setRoutineRows] = useState(() => {
    const saved = localStorage.getItem('myRoutine');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {
        return null;
      }
    }
    return null;
  });
  const [routineSaved, setRoutineSaved] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingAnswers, setOnboardingAnswers] = useState({});
  const [skincareRecommendations, setSkincareRecommendations] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [dermatologists, setDermatologists] = useState([]);
  const [selectedDermatologist, setSelectedDermatologist] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [funTip, setFunTip] = useState("");

  const pollRef = useRef(null);
  const selectedDermRef = useRef(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Token ${token}` } : {};
  };

  const loadUserProfile = async () => {
    try {
      const res = await fetch(`${API}/profile/`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.role && data.role !== 'customer') {
          alert('Session role mismatch. Please log in as a customer.');
          setLoggedIn(false);
          return;
        }
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  useEffect(() => {
    if (showProfile) {
      loadUserProfile();
    }
  }, [showProfile]);

  const loadMessages = async () => {
    try {
      const res = await fetch(`${API}/api/messages/`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const loadDermatologists = async () => {
    try {
      const res = await fetch(`${API}/api/dermatologists/`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });

      if (res.ok) {
        const data = await res.json();
        setDermatologists(data.dermatologists);
      }
    } catch (error) {
      console.error("Error loading dermatologists:", error);
    }
  };

  useEffect(() => {
    loadDermatologists();
  }, []);

  useEffect(() => {
    if (selectedDermatologist) {
      selectedDermRef.current = selectedDermatologist;
      setConversationMessages([]);
      setMessage("");
      loadConversation();
    } else {
      selectedDermRef.current = null;
    }
  }, [selectedDermatologist]);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (selectedDermRef.current) {
        loadConversation();
      }
    }, 2000);
    return () => { clearInterval(pollRef.current); pollRef.current = null; };
  }, []);

  useEffect(() => {
    const refreshActiveChat = () => {
      if (selectedDermRef.current) {
        loadConversation();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshActiveChat();
      }
    };

    window.addEventListener('focus', refreshActiveChat);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', refreshActiveChat);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const sendConversationMessage = async () => {
    const text = message.trim();
    if (!text || !selectedDermatologist) return;

    // Optimistic update — show message immediately
    const optimisticMsg = {
      isFromMe: true,
      message: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender_email: null,
      username: 'You'
    };
    setConversationMessages(prev => [...prev, optimisticMsg]);
    setMessage("");
    setTimeout(scrollToBottom, 50);

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/send_message/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify({
          message: text,
          recipient_email: selectedDermatologist.email
        })
      });

      if (res.ok) {
        // Replace optimistic list with confirmed server data
        await loadConversation();
      } else {
        // Roll back optimistic update on failure
        setConversationMessages(prev => prev.filter(m => m !== optimisticMsg));
        setMessage(text);
        try {
          const errorData = await res.json();
          alert(`Error sending message: ${errorData.error || 'Unknown error'}`);
        } catch (_) {
          alert(`Error sending message: Server returned status ${res.status}`);
        }
      }
    } catch (error) {
      setConversationMessages(prev => prev.filter(m => m !== optimisticMsg));
      setMessage(text);
      alert("Error sending message: " + error.message);
    }
    setLoading(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    if (!selectedDermatologist) return;
    try {
      const res = await fetch(
        `${API}/api/chat_history/?with=${selectedDermatologist.email}`,
        { headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, cache: 'no-store' }
      );

      if (res.ok) {
        const data = await res.json();
        setConversationMessages(data.messages);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const logout = async () => {
    await fetch(`${API}/logout/`, {
      method: "POST",
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    localStorage.removeItem('authToken');
    setLoggedIn(false);
  };


  const skincareTips = {
    "10-15": {
      focus: "Basic hygiene and prevention",
      routine: {
        morning: ["Mild face wash (2x daily)", "Light moisturizer", "SPF 30+"],
        night: ["Mild face wash", "Light moisturizer"]
      },
      products: ["Gentle foaming cleanser", "Light moisturizer"]
    },
    "16-20": {
      focus: "Acne prevention and basic care",
      routine: {
        morning: ["Cleanser", "Moisturizer", "Sunscreen (SPF 30+)"],
        night: ["Cleanser", "Treatment (if acne)", "Moisturizer"]
      },
      products: ["Gentle cleanser", "Moisturizer", "Sunscreen"]
    },
    "21-25": {
      focus: "Early treatment and prevention",
      routine: {
        morning: ["Cleanser", "Vitamin C serum", "Moisturizer", "Sunscreen"],
        night: ["Cleanser", "Treatment (retinol or exfoliant)", "Moisturizer"]
      },
      products: ["Vitamin C serum", "Retinol", "AHA exfoliant"]
    },
    "26-35": {
      focus: "Preventive anti-aging",
      routine: {
        morning: ["Cleanser", "Vitamin C", "Moisturizer", "Sunscreen"],
        night: ["Cleanser", "Retinol", "Moisturizer"]
      },
      products: ["Vitamin C serum", "Retinol", "Hyaluronic acid serum"]
    },
    "36-50": {
      focus: "Anti-aging and hydration",
      routine: {
        morning: ["Hydrating cleanser", "Vitamin C", "Moisturizer", "Sunscreen"],
        night: ["Cleanser", "Retinol / peptides", "Rich moisturizer"]
      },
      products: ["Retinol", "Peptides", "Rich moisturizer", "Hyaluronic acid"]
    },
    "50+": {
      focus: "Hydration and barrier repair",
      routine: {
        morning: ["Hydrating cleanser", "Antioxidant serum", "Rich moisturizer", "Sunscreen"],
        night: ["Cleanser", "Retinol / peptides", "Night cream"]
      },
      products: ["Retinol", "Peptides", "Night cream", "Antioxidant serum"]
    }
  };

  const skinTypeProducts = {
    "Oily": ["Gel cleanser", "Oil-free moisturizer", "Matte sunscreen", "Salicylic acid", "Niacinamide"],
    "Dry": ["Cream cleanser", "Hydrating serum", "Thick moisturizer", "Hyaluronic acid", "Ceramides"],
    "Combination": ["Gentle cleanser", "Light moisturizer", "Oil control serum", "Sunscreen"],
    "Sensitive": ["Fragrance-free cleanser", "Barrier moisturizer", "Mineral sunscreen", "Centella asiatica", "Aloe vera"]
  };

  const concernProducts = {
    "Acne/Pimples": { products: ["Salicylic acid", "Benzoyl peroxide", "Retinoids"], color: "#ff6b6b" },
    "Dark Spots": { products: ["Vitamin C", "Niacinamide", "Alpha arbutin", "Retinol"], color: "#ffa502" },
    "Dull Skin": { products: ["AHA exfoliant", "Vitamin C", "Hydrating serum"], color: "#ffd43b" },
    "Large Pores": { products: ["Salicylic acid", "Niacinamide", "Retinol"], color: "#a8e6cf" },
    "Wrinkles/Aging": { products: ["Retinol", "Peptides", "Sunscreen"], color: "#c7b3d5" },
    "Dryness": { products: ["Hyaluronic acid", "Ceramides", "Thick moisturizer"], color: "#ffb3ba" },
    "Redness/Irritation": { products: ["Centella asiatica", "Aloe vera", "Barrier cream"], color: "#bae1ff" }
  };

  const questions = [
    {
      id: 'ageGroup',
      question: 'Which age group do you belong to?',
      type: 'radio',
      options: ['10–15', '16–20', '21–25', '26–35', '36–50', '50+']
    },
    {
      id: 'skinType',
      question: 'What best describes your skin type?',
      type: 'radio',
      options: ['Oily', 'Dry', 'Combination (oily T-zone, dry cheeks)', 'Normal', 'Sensitive', 'Not sure']
    },
    {
      id: 'primaryConcern',
      question: 'What is your main skin concern? (Choose one or more)',
      type: 'checkbox',
      options: ['Acne / pimples', 'Acne scars', 'Dark spots / pigmentation', 'Dull skin', 'Large pores', 'Wrinkles / aging', 'Redness / irritation', 'Dry / dehydrated skin', 'Uneven skin tone', 'None']
    },
    {
      id: 'secondaryConcerns',
      question: 'Do you have any other skin issues?',
      type: 'checkbox',
      options: ['Blackheads / whiteheads', 'Sun damage', 'Dark circles', 'Texture / rough skin', 'Sensitive reactions']
    },
    {
      id: 'skinSensitivity',
      question: 'Does your skin react easily to products?',
      type: 'radio',
      options: ['Yes', 'No', 'Sometimes']
    },
    {
      id: 'currentRoutine',
      question: 'Do you currently use skincare products?',
      type: 'radio',
      options: ['No routine', 'Basic routine (cleanser + moisturizer)', 'Full routine (cleanser, serum, sunscreen, etc.)']
    },
    {
      id: 'sunExposure',
      question: 'How often are you exposed to the sun?',
      type: 'radio',
      options: ['Mostly indoors', 'Moderate outdoor exposure', 'High sun exposure']
    },
    {
      id: 'allergies',
      question: 'Are you allergic or sensitive to any ingredients?',
      type: 'radio',
      options: ['Yes', 'No', 'Not sure']
    },
    {
      id: 'lifestyle',
      question: 'Lifestyle Factors',
      type: 'multi',
      subQuestions: [
        {
          id: 'sleep',
          question: 'How many hours of sleep do you get?',
          type: 'select',
          options: ['Less than 4', '4-6', '6-8', '8-10', 'More than 10']
        },
        {
          id: 'water',
          question: 'How much water do you drink daily?',
          type: 'select',
          options: ['Less than 1L', '1-2L', '2-3L', '3-4L', 'More than 4L']
        }
      ]
    },
    {
      id: 'desiredGoal',
      question: 'What is your skincare goal?',
      type: 'radio',
      options: ['Clear acne', 'Brighter skin', 'Anti-aging', 'Hydration', 'Even skin tone', 'General skin health']
    }
  ];

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAnswer = (questionId, value) => {
    setOnboardingAnswers({ ...onboardingAnswers, [questionId]: value });
  };

  const handleSubmit = async () => {
    console.log('Onboarding answers:', onboardingAnswers);
    setChatLoading(true);
    try {
      const recs = await generateRecommendations(onboardingAnswers);
      setSkincareRecommendations(recs);
      setCurrentStep(0);
      setOnboardingAnswers({});
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert('Failed to generate recommendations. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const renderQuestion = (question) => {
    const currentAnswer = onboardingAnswers[question.id] || (question.type === 'checkbox' ? [] : '');

    if (question.type === 'multi') {
      return (
        <div>
          <h4>{question.question}</h4>
          {question.subQuestions.map(sub => (
            <div key={sub.id} className="sub-question">
              <p>{sub.question}</p>
              <select
                value={onboardingAnswers[sub.id] || ''}
                onChange={(e) => handleAnswer(sub.id, e.target.value)}
              >
                <option value="">Select</option>
                {sub.options.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div>
        <h4>{question.question}</h4>
        {question.type === 'radio' && (
          <div className="options">
            {question.options.map(option => (
              <label key={option} className="option">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswer(question.id, e.target.value)}
                />
                {option}
              </label>
            ))}
          </div>
        )}
        {question.type === 'checkbox' && (
          <div className="options">
            {question.options.map(option => (
              <label key={option} className="option">
                <input
                  type="checkbox"
                  value={option}
                  checked={currentAnswer.includes(option)}
                  onChange={(e) => {
                    const updated = currentAnswer.includes(option)
                      ? currentAnswer.filter(o => o !== option)
                      : [...currentAnswer, option];
                    handleAnswer(question.id, updated);
                  }}
                />
                {option}
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  const generateRecommendations = async (answers) => {
    const prompt = `Based on the following user skincare profile, provide personalized skincare recommendations. Include daily routine suggestions, product recommendations, and tips. Keep it concise but comprehensive.

User Profile:
- Age Group: ${answers.ageGroup}
- Skin Type: ${answers.skinType}
- Primary Concerns: ${answers.primaryConcern?.join(', ')}
- Secondary Concerns: ${answers.secondaryConcerns?.join(', ')}
- Skin Sensitivity: ${answers.skinSensitivity}
- Current Routine: ${answers.currentRoutine}
- Sun Exposure: ${answers.sunExposure}
- Allergies: ${answers.allergies}
- Sleep: ${answers.sleep}
- Water Intake: ${answers.water}
- Desired Goal: ${answers.desiredGoal}

Provide recommendations in a structured format with sections for Morning Routine, Evening Routine, Product Suggestions, and Additional Tips.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate recommendations');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const sendChatMessage = async () => {
    if (chatInput.trim() === '') return;

    const userMessage = { role: 'user', content: chatInput };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const context = `User's skincare profile:
- Age Group: ${onboardingAnswers.ageGroup}
- Skin Type: ${onboardingAnswers.skinType}
- Primary Concerns: ${onboardingAnswers.primaryConcern?.join(', ')}
- Secondary Concerns: ${onboardingAnswers.secondaryConcerns?.join(', ')}
- Skin Sensitivity: ${onboardingAnswers.skinSensitivity}
- Current Routine: ${onboardingAnswers.currentRoutine}
- Sun Exposure: ${onboardingAnswers.sunExposure}
- Allergies: ${onboardingAnswers.allergies}
- Sleep: ${onboardingAnswers.sleep}
- Water Intake: ${onboardingAnswers.water}
- Desired Goal: ${onboardingAnswers.desiredGoal}

Previous conversation:
${chatMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User's new question: ${chatInput}`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: context }],
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const aiMessage = { role: 'assistant', content: data.choices[0].message.content };
      setChatMessages([...newMessages, aiMessage]);
    } catch (error) {
      console.error('Error sending chat message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const funTips = [
    "Wash your face morning and night, keep your skin fresh and bright.",
    "Remove makeup before bed, let your skin rest instead.",
    "Wear sunscreen every day, keep sun damage away.",
    "Moisturize your skin with care, soft and glowing everywhere.",
    "Drink water sip by sip, let healthy glow gently drip.",
    "Eat fruits and veggies too, they add a natural glow to you.",
    "Don’t touch your face all day, germs might come your way.",
    "Exfoliate once or twice, smooth skin always feels nice.",
    "Sleep well every night, tired skin loses its light.",
    "Stress less, smile more, your skin will surely adore.",
    "Avoid harsh products strong, gentle care goes a long way along.",
    "Pick products that suit your skin, that’s where good care should begin.",
    "Clean pillowcases every week, happy skin is what you seek.",
    "Too much sun is not so sweet, shade and sunscreen are the treat.",
    "Don’t wash your face too much, balance needs a gentle touch.",
    "Use warm water, not too hot, your skin will like it a lot.",
    "Don’t pop pimples in a fight, patience will heal them right.",
    "Move your body, exercise a bit, glowing skin will follow it.",
    "Keep your skin hydrated all day, dryness should stay away.",
    "Love your skin the way it is, confidence is the final bliss. ✨"
  ];

  const showRandomTip = () => {
    if (funTips.length === 0) return;
    if (funTips.length === 1) {
      setFunTip(funTips[0]);
      return;
    }
    let nextTip = funTips[Math.floor(Math.random() * funTips.length)];
    while (nextTip === funTip) {
      nextTip = funTips[Math.floor(Math.random() * funTips.length)];
    }
    setFunTip(nextTip);
  };

  const getDefaultRoutineRows = () => (
    [
      { step: "Step 1", morning: "", evening: "", notes: "" },
      { step: "Step 2", morning: "", evening: "", notes: "" },
      { step: "Step 3", morning: "", evening: "", notes: "" },
      { step: "Step 4", morning: "", evening: "", notes: "" },
      { step: "Step 5", morning: "", evening: "", notes: "" }
    ]
  );

  const effectiveRoutineRows = routineRows || getDefaultRoutineRows();

  const updateRoutineRow = (index, field, value) => {
    setRoutineRows((prevRows) => {
      const rows = prevRows || getDefaultRoutineRows();
      const nextRows = rows.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        return { ...row, [field]: value };
      });
      return nextRows;
    });
  };

  const saveRoutine = () => {
    localStorage.setItem('myRoutine', JSON.stringify(effectiveRoutineRows));
    setRoutineSaved(true);
    setTimeout(() => setRoutineSaved(false), 2500);
  };

  const addRoutineRow = () => {
    setRoutineRows((prevRows) => {
      const rows = prevRows || getDefaultRoutineRows();
      return [
        ...rows,
        { step: `Step ${rows.length + 1}`, morning: "", evening: "", notes: "" }
      ];
    });
  };

  const removeRoutineRow = (index) => {
    setRoutineRows((prevRows) => {
      const rows = prevRows || getDefaultRoutineRows();
      if (rows.length <= 1) return rows;
      return rows.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const productCatalog = {
    "Cleanser": [
      {
        name: "CeraVe Hydrating Facial Cleanser",
        ingredient: "Ceramides, Hyaluronic Acid",
        description: "A gentle, non-foaming cleanser that removes dirt while keeping the skin hydrated and maintaining the skin's natural barrier."
      },
      {
        name: "Cetaphil Gentle Skin Cleanser",
        ingredient: "Glycerin",
        description: "A mild cleanser designed for sensitive skin that cleans without stripping natural moisture."
      },
      {
        name: "Neutrogena Ultra Gentle Cleanser",
        ingredient: "Glycerin",
        description: "A dermatologist-tested cleanser that removes impurities while being gentle on delicate or reactive skin."
      }
    ],
    "Face Wash": [
      {
        name: "La Roche-Posay Effaclar Foaming Gel",
        ingredient: "Zinc PCA",
        description: "A purifying foaming gel that removes excess oil and helps cleanse acne-prone skin."
      },
      {
        name: "Himalaya Purifying Neem Face Wash",
        ingredient: "Neem",
        description: "A herbal face wash that helps control oil, cleanse pores, and reduce acne with neem and turmeric."
      },
      {
        name: "Clean & Clear Foaming Face Wash",
        ingredient: "Salicylic Acid",
        description: "A refreshing foaming cleanser that removes dirt, oil, and impurities for a clean feeling."
      }
    ],
    "Toner": [
      {
        name: "Thayers Witch Hazel Toner",
        ingredient: "Witch Hazel",
        description: "A soothing alcohol-free toner that helps tighten pores and refresh the skin."
      },
      {
        name: "Klairs Supple Preparation Toner",
        ingredient: "Hyaluronic Acid",
        description: "A hydrating toner that balances skin's pH and improves absorption of skincare products."
      },
      {
        name: "Pixi Glow Tonic",
        ingredient: "Glycolic Acid",
        description: "An exfoliating toner with glycolic acid that helps brighten and smooth the skin."
      }
    ],
    "Serum": [
      {
        name: "The Ordinary Niacinamide 10% + Zinc 1%",
        ingredient: "Niacinamide",
        description: "A serum that helps reduce blemishes, control oil, and improve skin texture."
      },
      {
        name: "La Roche-Posay Hyalu B5 Serum",
        ingredient: "Hyaluronic Acid",
        description: "A hydrating serum with hyaluronic acid that plumps and repairs the skin barrier."
      },
      {
        name: "L'Oreal Revitalift Vitamin C Serum",
        ingredient: "Vitamin C",
        description: "A brightening serum that helps improve skin tone and reduce dullness."
      }
    ],
    "Moisturizer": [
      {
        name: "Neutrogena Hydro Boost Water Gel",
        ingredient: "Hyaluronic Acid",
        description: "A lightweight moisturizer that deeply hydrates the skin using hyaluronic acid."
      },
      {
        name: "CeraVe Moisturizing Cream",
        ingredient: "Ceramides",
        description: "A rich moisturizer that restores the skin barrier and provides long-lasting hydration."
      },
      {
        name: "Simple Hydrating Light Moisturizer",
        ingredient: "Vitamin B5",
        description: "A gentle moisturizer that hydrates the skin without irritation or harsh chemicals."
      }
    ],
    "Sunscreen": [
      {
        name: "Biore UV Aqua Rich Watery Essence SPF50+",
        ingredient: "UV Filters",
        description: "A lightweight sunscreen that provides strong UV protection while feeling watery and breathable."
      },
      {
        name: "Neutrogena Ultra Sheer Dry-Touch SPF50",
        ingredient: "Helioplex",
        description: "A sunscreen that offers high sun protection with a lightweight, non-greasy finish."
      },
      {
        name: "La Roche-Posay Anthelios SPF50",
        ingredient: "Mexoryl",
        description: "A dermatologist-recommended sunscreen that protects against UVA and UVB rays."
      }
    ],
    "Face Cream": [
      {
        name: "Nivea Soft Cream",
        ingredient: "Vitamin E",
        description: "A moisturizing cream that softens and hydrates the skin with a light texture."
      },
      {
        name: "Pond's Light Moisturizing Cream",
        ingredient: "Glycerin",
        description: "A lightweight cream that keeps the skin soft and moisturized throughout the day."
      },
      {
        name: "Olay Total Effects Cream",
        ingredient: "Niacinamide",
        description: "A multi-benefit anti-aging cream that helps improve skin tone, texture, and hydration."
      }
    ],
    "Night Cream": [
      {
        name: "Olay Retinol 24 Night Cream",
        ingredient: "Retinol",
        description: "A night cream with retinol that helps smooth wrinkles and renew skin overnight."
      },
      {
        name: "L'Oreal Revitalift Night Cream",
        ingredient: "Pro-Retinol",
        description: "A night moisturizer that helps firm the skin and reduce signs of aging."
      },
      {
        name: "Neutrogena Rapid Wrinkle Repair Night Cream",
        ingredient: "Retinol SA",
        description: "A retinol-based night cream designed to reduce wrinkles and fine lines."
      }
    ],
    "Eye Cream": [
      {
        name: "Kiehl's Avocado Eye Cream",
        ingredient: "Avocado Oil",
        description: "A nourishing eye cream that hydrates and smooths the delicate under-eye area."
      },
      {
        name: "Olay Eyes Ultimate Eye Cream",
        ingredient: "Peptides",
        description: "An eye cream that helps reduce dark circles, puffiness, and fine lines."
      },
      {
        name: "Neutrogena Hydro Boost Eye Gel",
        ingredient: "Hyaluronic Acid",
        description: "A refreshing eye gel that hydrates and smooths the under-eye area."
      }
    ],
    "Face Oil": [
      {
        name: "The Ordinary Rose Hip Seed Oil",
        ingredient: "Rosehip Oil",
        description: "A natural facial oil that nourishes skin and improves skin texture."
      },
      {
        name: "Kiehl's Midnight Recovery Oil",
        ingredient: "Lavender Oil",
        description: "A nighttime facial oil that helps restore and repair skin while you sleep."
      },
      {
        name: "Bio-Oil Skincare Oil",
        ingredient: "Vitamin A & E",
        description: "A multi-purpose oil designed to improve the appearance of scars, stretch marks, and uneven skin tone."
      }
    ],
    "Exfoliator": [
      {
        name: "Paula's Choice 2% BHA Liquid",
        ingredient: "Salicylic Acid",
        description: "A chemical exfoliant that unclogs pores and improves skin clarity."
      },
      {
        name: "The Ordinary AHA 30% + BHA 2% Peeling Solution",
        ingredient: "Glycolic Acid",
        description: "A strong exfoliating treatment that improves skin texture and brightness."
      },
      {
        name: "Dermalogica Daily Microfoliant",
        ingredient: "Rice Enzymes",
        description: "A gentle exfoliating powder that smooths and brightens the skin."
      }
    ],
    "Scrub": [
      {
        name: "St. Ives Apricot Scrub",
        ingredient: "Apricot Extract",
        description: "A physical exfoliating scrub that removes dead skin cells for smoother skin."
      },
      {
        name: "Himalaya Walnut Scrub",
        ingredient: "Walnut Shell",
        description: "A natural scrub that exfoliates the skin using walnut particles."
      },
      {
        name: "Neutrogena Deep Clean Scrub",
        ingredient: "Beta Hydroxy Acid",
        description: "A mild exfoliating scrub that helps cleanse pores and smooth skin."
      }
    ],
    "Face Mask": [
      {
        name: "Laneige Water Sleeping Mask",
        ingredient: "Mineral Water",
        description: "A hydrating overnight mask that replenishes moisture while you sleep."
      },
      {
        name: "Garnier Hydra Bomb Mask",
        ingredient: "Hyaluronic Acid",
        description: "A sheet mask that intensely hydrates and refreshes the skin."
      },
      {
        name: "Fresh Rose Face Mask",
        ingredient: "Rose Extract",
        description: "A soothing mask with rose extracts that hydrates and softens the skin."
      }
    ],
    "Clay Mask": [
      {
        name: "Aztec Secret Healing Clay",
        ingredient: "Bentonite Clay",
        description: "A deep cleansing clay mask that draws out impurities from the skin."
      },
      {
        name: "L'Oreal Pure Clay Mask",
        ingredient: "Kaolin Clay",
        description: "A detoxifying mask that cleanses pores and absorbs excess oil."
      },
      {
        name: "Innisfree Super Volcanic Pore Clay Mask",
        ingredient: "Volcanic Ash",
        description: "A pore-clearing mask that helps control oil and tighten pores."
      }
    ],
    "Sheet Mask": [
      {
        name: "Innisfree My Real Squeeze Mask",
        ingredient: "Green Tea",
        description: "A nourishing sheet mask that delivers hydration and nutrients to the skin."
      },
      {
        name: "Mediheal N.M.F Aquaring Mask",
        ingredient: "Hyaluronic Acid",
        description: "A hydrating sheet mask that helps maintain moisture balance in the skin."
      },
      {
        name: "Garnier Sakura Sheet Mask",
        ingredient: "Sakura Extract",
        description: "A brightening sheet mask that hydrates and refreshes dull skin."
      }
    ],
    "Essence": [
      {
        name: "COSRX Snail 96 Mucin Essence",
        ingredient: "Snail Mucin",
        description: "An essence that repairs damaged skin and improves hydration."
      },
      {
        name: "SK-II Facial Treatment Essence",
        ingredient: "Pitera",
        description: "A luxury essence that improves skin texture and radiance."
      },
      {
        name: "Missha Time Revolution Essence",
        ingredient: "Fermented Yeast",
        description: "A hydrating essence that helps improve skin tone and elasticity."
      }
    ],
    "Spot Treatment": [
      {
        name: "Clean & Clear Acne Spot Treatment",
        ingredient: "Salicylic Acid",
        description: "A targeted treatment that helps reduce pimples and acne."
      },
      {
        name: "Mario Badescu Drying Lotion",
        ingredient: "Sulfur",
        description: "A spot treatment that helps dry out pimples overnight."
      },
      {
        name: "Neutrogena On-the-Spot Treatment",
        ingredient: "Benzoyl Peroxide",
        description: "A benzoyl peroxide treatment that helps clear acne quickly."
      }
    ],
    "Lip Balm": [
      {
        name: "Nivea Lip Care Balm",
        ingredient: "Shea Butter",
        description: "A moisturizing lip balm that protects and softens dry lips."
      },
      {
        name: "Burt's Bees Beeswax Lip Balm",
        ingredient: "Beeswax",
        description: "A natural lip balm that nourishes and protects lips with beeswax."
      },
      {
        name: "Laneige Lip Sleeping Mask",
        ingredient: "Berry Extract",
        description: "An overnight lip mask that deeply hydrates and softens lips."
      }
    ],
    "Makeup Remover": [
      {
        name: "Garnier Micellar Cleansing Water",
        ingredient: "Micelles",
        description: "A gentle cleanser that removes makeup and impurities using micellar technology."
      },
      {
        name: "Bioderma Sensibio H2O",
        ingredient: "Micellar Technology",
        description: "A soothing micellar water designed for sensitive skin to remove makeup and dirt."
      },
      {
        name: "Neutrogena Makeup Remover Wipes",
        ingredient: "Cleansing Lotion",
        description: "Pre-moistened wipes that quickly remove makeup and impurities."
      }
    ],
    "Face Mist / Face Spray": [
      {
        name: "Mario Badescu Facial Spray",
        ingredient: "Aloe & Rosewater",
        description: "A refreshing face mist that hydrates and revitalizes the skin."
      },
      {
        name: "Caudalie Grape Water Mist",
        ingredient: "Grape Water",
        description: "A soothing face mist made from grape water that hydrates and calms the skin."
      },
      {
        name: "Avene Thermal Spring Water Spray",
        ingredient: "Thermal Spring Water",
        description: "A calming mineral water spray that helps soothe sensitive or irritated skin."
      }
    ]
  };

  const productCategories = Object.keys(productCatalog);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h2>TwachaGuide - Customer Dashboard</h2>
          <p>Connect with Skincare Professionals</p>
        </div>
        <div className="header-right">
          <span className="user-info">{userEmail}</span>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3>Quick Actions</h3>
            <ul>
              <li><button className="skincare-btn" onClick={() => { setShowMessages(!showMessages); setSelectedDermatologist(null); setShowAiAssistant(false); }}>Messages</button></li>
              <li><button className="skincare-btn" onClick={() => { setShowAiAssistant(!showAiAssistant); setShowMessages(false); }}>AI Assistant</button></li>
              <li>
                <button
                  className="skincare-btn"
                  onClick={() => {
                    setShowDailyTips(true);
                    setShowMessages(false);
                    setShowAiAssistant(false);
                    setShowSkincare(false);
                    setShowProfile(false);
                    setSelectedDermatologist(null);
                    setShowProductSuggestions(false);
                    setShowRoutineGenerator(false);
                  }}
                >
                  Daily Tips
                </button>
              </li>
              <li>
                <button
                  className="skincare-btn"
                  onClick={() => {
                    setShowProductSuggestions(true);
                    setShowRoutineGenerator(false);
                    setShowDailyTips(false);
                    setShowMessages(false);
                    setShowAiAssistant(false);
                    setShowSkincare(false);
                    setShowProfile(false);
                    setSelectedDermatologist(null);
                    setSelectedCategory(null);
                  }}
                >
                  Product Suggestions
                </button>
              </li>
              <li>
                <button
                  className="skincare-btn"
                  onClick={() => {
                    setShowRoutineGenerator(true);
                    setShowProductSuggestions(false);
                    setShowDailyTips(false);
                    setShowMessages(false);
                    setShowAiAssistant(false);
                    setShowSkincare(false);
                    setShowProfile(false);
                    setSelectedDermatologist(null);
                  }}
                >
                  My Routine
                </button>
              </li>
              <li><button 
                className="skincare-btn" 
                onClick={() => setShowSkincare(!showSkincare)}
              >
                My Skincare
              </button></li>
              <li><button className="skincare-btn" onClick={() => setShowProfile(!showProfile)}>My Profile</button></li>
            </ul>
          </div>
        </aside>

        {/* Main Area - Messages, Skincare, AI Assistant, or Default Chat */}
        {showAiAssistant ? (
          <main className="chat-area">
            <div className="chat-header-section">
              <h3>AI Skincare Assistant</h3>
              <p>Get instant skincare advice from our AI</p>
            </div>

            <div className="messages-container">
              {chatMessages.length === 0 ? (
                <div className="no-messages">
                  <p>Start by asking a skincare question! The AI will provide personalized advice based on your profile.</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={`message-bubble ${msg.role === 'user' ? 'from-me' : 'from-doctor'}`}>
                    <div className="message-header">
                      <strong className="sender-email">{msg.role === 'user' ? 'You' : 'AI Assistant'}</strong>
                    </div>
                    <div className="message-content">{msg.content}</div>
                  </div>
                ))
              )}
            </div>

            <div className="message-input-area">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    sendChatMessage();
                  }
                }}
                placeholder="Ask a skincare question..."
                className="message-input"
              />
              <button 
                className="send-btn" 
                onClick={sendChatMessage}
                disabled={chatLoading || chatInput.trim() === ""}
              >
                {chatLoading ? "Thinking..." : "Send"}
              </button>
            </div>
          </main>
        ) : showMessages ? (
          selectedDermatologist ? (
            <main className="chat-area">
              <div className="chat-header-section">
                <button className="back-btn" onClick={() => { setSelectedDermatologist(null); setConversationMessages([]); setMessage(""); }}>← Back</button>
                <h3>Chat with Dr. {selectedDermatologist.name}</h3>
                <p>📧 {selectedDermatologist.email}</p>
              </div>

              <div className="messages-container">
                {conversationMessages.length === 0 ? (
                  <div className="no-messages">
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  conversationMessages.map((msg, i) => {
                    const isMine = msg.isFromMe === true;
                    return (
                      <div key={i} className={isMine ? 'chat-msg chat-msg-sent' : 'chat-msg chat-msg-received'}>
                        <div className="chat-msg-sender">
                          {!isMine && (msg.username || `Dr. ${selectedDermatologist.name}`)}
                        </div>
                        <div className="chat-msg-text">{msg.message}</div>
                        <span className="chat-msg-time">{msg.timestamp}</span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="message-input-area">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      sendConversationMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  className="message-input"
                />
                <button 
                  className="send-btn" 
                  onClick={sendConversationMessage}
                  disabled={loading || message.trim() === ""}
                >
                  {loading ? "Sending..." : "Send"}
                </button>
              </div>
            </main>
          ) : (
            <main className="chat-area">
              <div className="chat-header-section">
                <h3>Chat with Dermatologists</h3>
                <p>Select a dermatologist to start a conversation</p>
              </div>

              <div className="dermatologists-list">
                {dermatologists.length === 0 ? (
                  <div className="no-messages">
                    <p>No dermatologists available at the moment.</p>
                  </div>
                ) : (
                  dermatologists.map((doc, i) => (
                    <div key={i} className="dermatologist-card" onClick={() => { setConversationMessages([]); setMessage(""); setSelectedDermatologist(doc); }}>
                      <div className="doc-header">
                        <h4>Dr. {doc.name}</h4>
                      </div>
                      <div className="doc-info">
                        <p><strong>Email:</strong> {doc.email}</p>
                        <p><strong>Location:</strong> {doc.address}</p>
                      </div>
                      <button className="chat-with-btn">Start Chat</button>
                    </div>
                  ))
                )}
              </div>
            </main>
          )
        ) : showProductSuggestions ? (
          <main className="chat-area">
            <div className="chat-header-section">
              <h3>Product Suggestions</h3>
              <p>Browse categories and explore product types that fit your routine.</p>
            </div>

            <div className="messages-container">
              {selectedCategory ? (
                <div className="product-list-wrapper">
                  <div className="product-detail-header">
                    <button className="back-btn" onClick={() => setSelectedCategory(null)}> Back</button>
                    <h4>{selectedCategory}</h4>
                  </div>
                  <div className="product-list">
                    {productCatalog[selectedCategory].map((product) => (
                      <div key={product.name} className="product-item">
                        <div className="product-info">
                          <h5>{product.name}</h5>
                          <p><strong>Main ingredient:</strong> {product.ingredient}</p>
                          <p className="product-desc">Description: {product.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="product-grid">
                  {productCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className="product-card"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </main>
        ) : showRoutineGenerator ? (
          <main className="chat-area">
            <div className="chat-header-section">
              <h3>My Routine</h3>
              <p>Fill in your daily routine and save it for later.</p>
            </div>

            <div className="messages-container">
              <div className="routine-wrapper">
                <table className="routine-table">
                  <thead>
                    <tr>
                      <th>Steps</th>
                      <th>Morning Routine</th>
                      <th>Evening Routine</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveRoutineRows.map((row, index) => (
                      <tr key={`${row.step}-${index}`}>
                        <td>
                          <input
                            className="routine-input"
                            type="text"
                            value={row.step}
                            onChange={(e) => updateRoutineRow(index, 'step', e.target.value)}
                          />
                        </td>
                        <td>
                          <textarea
                            className="routine-textarea"
                            value={row.morning}
                            onChange={(e) => updateRoutineRow(index, 'morning', e.target.value)}
                          />
                        </td>
                        <td>
                          <textarea
                            className="routine-textarea"
                            value={row.evening}
                            onChange={(e) => updateRoutineRow(index, 'evening', e.target.value)}
                          />
                        </td>
                        <td>
                          <textarea
                            className="routine-textarea"
                            value={row.notes}
                            onChange={(e) => updateRoutineRow(index, 'notes', e.target.value)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="routine-delete-btn"
                            onClick={() => removeRoutineRow(index)}
                            disabled={effectiveRoutineRows.length === 1}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="routine-actions">
                  <button className="routine-add-btn" onClick={addRoutineRow}>Add Row</button>
                  <button className="routine-save-btn" onClick={saveRoutine}>Save Routine</button>
                  {routineSaved && <span className="routine-saved">Saved!</span>}
                </div>
              </div>
            </div>
          </main>
        ) : showSkincare ? (
          <main className="chat-area">
            {skincareRecommendations ? (
              <div className="recommendations-container">
                <div className="recommendations-header">
                  <button className="back-btn" onClick={() => { setShowSkincare(false); setSkincareRecommendations(null); }}>← Back</button>
                  <h3>Your Personalized Skincare Plan</h3>
                  <p>Customized recommendations based on your profile</p>
                </div>
                <div className="recommendations-full">
                  <div className="recommendations-text" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '0.95rem' }}>
                    {skincareRecommendations}
                  </div>
                </div>
                <div className="recommendations-footer">
                  <button className="back-btn" onClick={() => { setShowSkincare(false); setSkincareRecommendations(null); }}>Close</button>
                </div>
              </div>
            ) : (
              <div className="onboarding-container">
                <div className="onboarding-header">
                  <h3>Skincare Onboarding</h3>
                  <p>Step {currentStep + 1} of {questions.length}</p>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}></div>
                  </div>
                </div>
                <div className="onboarding-content">
                  {renderQuestion(questions[currentStep])}
                </div>
                <div className="onboarding-footer">
                  <button onClick={handlePrev} disabled={currentStep === 0} className="prev-btn">Previous</button>
                  {currentStep < questions.length - 1 ? (
                    <button onClick={handleNext} className="next-btn">Next</button>
                  ) : (
                    <button onClick={handleSubmit} className="submit-btn">Complete</button>
                  )}
                </div>
              </div>
            )}
          </main>
        ) : showProfile ? (
          <main className="chat-area">
            <div className="profile-container">
              <h3>My Profile</h3>
              {userProfile ? (
                <div className="profile-details">
                  <div className="profile-item">
                    <strong>Email:</strong>
                    <span>{userProfile.email}</span>
                  </div>
                  <div className="profile-item">
                    <strong>Role:</strong>
                    <span>{userProfile.role === 'customer' ? 'Customer' : 'Dermatologist'}</span>
                  </div>
                  {userProfile.name && (
                    <div className="profile-item">
                      <strong>Name:</strong>
                      <span>{userProfile.name}</span>
                    </div>
                  )}
                  {userProfile.address && (
                    <div className="profile-item">
                      <strong>Address:</strong>
                      <span>{userProfile.address}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p>Loading profile...</p>
              )}
            </div>
          </main>
        ) : (
          <main className="chat-area">
            <div className="chat-header-section">
              <h3>Welcome to TwachaGuide</h3>
              <p>A friendly skin coach that knows your face’s secrets, 
                offers advice without judgment,
                 and helps your skin feel cared for, 
                 so it happily glows back at you.</p>
            </div>
            {showDailyTips && (
              <div className="messages-container daily-tips-container">
                <div className="daily-tips-panel">
                  <p className="daily-tips-cta">Discover a mini skin treat in one tap!</p>
                  <div className="daily-tips-action">
                    <button className="daily-tips-btn" onClick={showRandomTip}>
                      Click here for fun tips
                    </button>
                  </div>
                  <div className="daily-tips-tip">
                    {funTip ? funTip : "Your tip will appear here."}
                  </div>
                </div>
              </div>
            )}
          </main>
        )}

        {/* Right Panel */}
        <aside className="right-panel">
          {showAiAssistant ? (
            <div className="panel-card">
              <h4>📋 AI Features</h4>
              <p>Ask any skincare question and get instant AI-powered advice customized for your skin profile!</p>
            </div>
          ) : (
            <div className="panel-card">
              <h4>Quick Tips</h4>
              <p>Use the AI Skincare Assistant for personalized advice.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default CustomerDashboard;
