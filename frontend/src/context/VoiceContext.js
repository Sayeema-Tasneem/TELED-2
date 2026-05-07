import React, { createContext, useState, useCallback, useRef } from 'react';

export const VoiceContext = createContext();

export const VoiceProvider = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [heardText, setHeardText] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  
  // Current screen context for smart voice handling
  const [currentScreen, setCurrentScreen] = useState('Dashboard');
  const [voiceContextData, setVoiceContextData] = useState({});

  const voiceStateRef = useRef({
    isListening: false,
    heardText: '',
    isProcessing: false,
  });

  const updateVoiceState = useCallback((newState) => {
    if (newState.isListening !== undefined) setIsListening(newState.isListening);
    if (newState.heardText !== undefined) setHeardText(newState.heardText);
    if (newState.isProcessingVoice !== undefined) setIsProcessingVoice(newState.isProcessingVoice);
    
    voiceStateRef.current = {
      isListening: newState.isListening ?? voiceStateRef.current.isListening,
      heardText: newState.heardText ?? voiceStateRef.current.heardText,
      isProcessing: newState.isProcessingVoice ?? voiceStateRef.current.isProcessing,
    };
  }, []);

  const setScreenContext = useCallback((screen, contextData = {}) => {
    setCurrentScreen(screen);
    setVoiceContextData(contextData);
  }, []);

  const clearVoiceState = useCallback(() => {
    setIsListening(false);
    setHeardText('');
    setIsProcessingVoice(false);
    setVoiceContextData({});
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        isListening,
        heardText,
        isProcessingVoice,
        currentScreen,
        voiceContextData,
        updateVoiceState,
        setScreenContext,
        clearVoiceState,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoiceContext = () => {
  const context = React.useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoiceContext must be used within VoiceProvider');
  }
  return context;
};
