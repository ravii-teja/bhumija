import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';

// A simple, robust custom markdown-to-HTML formatter for clean rendering without external dependencies
function formatMessage(text) {
  if (!text) return '';
  
  // Escape HTML entities to prevent XSS
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Handle headers
  formatted = formatted.replace(/^#### (.*?)$/gm, '<h4 class="text-xs font-bold text-brand-800 uppercase tracking-wider mt-4 mb-1">$1</h4>');
  formatted = formatted.replace(/^### (.*?)$/gm, '<h3 class="text-sm font-bold text-stone-800 mt-4 mb-2 border-b border-stone-100 pb-1">$1</h3>');
  formatted = formatted.replace(/^## (.*?)$/gm, '<h2 class="text-base font-bold text-stone-800 mt-5 mb-2">$1</h2>');

  // Handle bold text (**text**)
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-stone-900">$1</strong>');

  // Handle bullet points (- item or * item)
  formatted = formatted.replace(/^[-\*]\s+(.*?)$/gm, '<li class="ml-4 list-disc text-stone-700 mb-1.5">$1</li>');

  // Wrap bullet points in <ul> tags if they are adjacent
  // This is a simple regex replacement to group list items
  formatted = formatted.replace(/((?:<li.*?>.*?<\/li>\s*)+)/g, '<ul class="my-2 space-y-1">$1</ul>');

  // Handle line breaks
  formatted = formatted.replace(/\n/g, '<br />');

  return <div dangerouslySetInnerHTML={{ __html: formatted }} className="text-sm leading-relaxed text-stone-700" />;
}

export default function ChatComponent({ selectedLocation, geminiConfigured, embedded = false }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '### 🌾 Welcome to Bhumija!\n\nI am your **AI-Powered El Niño Resilience Advisor**. I can help you with crop switching, soil moisture conservation, and water management.\n\n**To get started:**\n- Select your farm location on the map, or search for your district.\n- Ask me any questions about drought-resilient crops, farm ponds, or soil preparation.\n- Upload an image of your soil or crop for a visual diagnosis!'
    }
  ]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() && !image) return;

    const userMessage = input;
    const currentImage = image;
    const currentImagePreview = imagePreview;

    // Add user message to chat history
    const newMessages = [...messages, { role: 'user', content: userMessage, image: currentImagePreview }];
    setMessages(newMessages);
    setInput('');
    clearImage();
    setLoading(true);
    setError(null);

    // Prepare FormData
    const formData = new FormData();
    formData.append('message', userMessage);
    if (selectedLocation) {
      formData.append('lat', selectedLocation.lat);
      formData.append('lon', selectedLocation.lon);
    }
    if (currentImage) {
      formData.append('image', currentImage);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response from Bhumija AI.');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      console.error(err);
      setError('Connection error. Please check if the backend is running.');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ **System Error:** I could not reach the Bhumija AI brain. Please make sure your backend server is running and try again.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex h-full flex-col overflow-hidden bg-white ${
        embedded ? '' : 'rounded-2xl border border-stone-200 shadow-sm'
      }`}
    >
      {!embedded && (
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 bg-brand-50 px-4 py-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="rounded-xl bg-brand-600 p-1.5 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-800">Bhumija AI Advisor</h3>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                {geminiConfigured ? 'Gemini 2.5 Flash Active' : 'Expert Rule-Based Mode'}
              </p>
            </div>
          </div>
          {selectedLocation && (
            <div className="text-right text-xs">
              <div className="max-w-[150px] truncate font-bold text-stone-700">
                {selectedLocation.district ? selectedLocation.district.name : 'Custom Location'}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-stone-50/50 p-3 md:p-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-tr-none'
                  : 'bg-white border border-stone-200 text-stone-800 rounded-tl-none'
              }`}
            >
              {msg.image && (
                <div className="mb-2 rounded-lg overflow-hidden border border-black/10 max-h-48">
                  <img src={msg.image} alt="Uploaded field" className="w-full h-full object-cover" />
                </div>
              )}
              {msg.role === 'user' ? (
                <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              ) : (
                formatMessage(msg.content)
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center space-x-3">
              <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
              <span className="text-xs font-semibold text-stone-500">Bhumija is analyzing agricultural parameters...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-3 py-2 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div
        className="shrink-0 space-y-2 border-t border-stone-100 bg-white p-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {/* Image Preview */}
        {imagePreview && (
          <div className="relative inline-block bg-stone-100 p-1 rounded-xl border border-stone-200">
            <img src={imagePreview} alt="Preview" className="h-14 w-14 object-cover rounded-lg" />
            <button
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 bg-stone-800 text-white rounded-full p-0.5 hover:bg-stone-900 shadow-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition active:scale-95 ${
              imagePreview ? 'border-brand-200 bg-brand-50 text-brand-600' : 'bg-white'
            }`}
            title="Upload field image"
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          <input
            type="text"
            enterKeyHint="send"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedLocation ? 'Ask about crops, water…' : 'Select location on map first…'
            }
            className="min-h-[48px] flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 text-base font-medium text-stone-800 placeholder-stone-400 focus:border-brand-500 focus:bg-white focus:outline-none md:text-sm"
          />

          <button
            type="submit"
            disabled={(!input.trim() && !image) || loading}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition active:scale-95 disabled:bg-stone-200 disabled:text-stone-400"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        {!embedded && (
          <div className="hidden items-center justify-between px-1 text-[10px] text-stone-400 sm:flex">
            <span>Free digital shield for Indian farmers</span>
          </div>
        )}
      </div>
    </div>
  );
}
