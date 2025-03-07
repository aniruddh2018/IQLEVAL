"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heart, Star, Sun, Moon, Cloud, Flower2, LucideIcon, ArrowRight } from 'lucide-react'

interface MemoryGameProps {
  onComplete: (score: number) => void
}

type MemoryCard = {
  id: number
  icon: LucideIcon
  isMatched: boolean
  isFlipped: boolean
  color: string
}

// Session storage keys for Memory Game
const MEMORY_STORAGE_KEYS = {
  CARDS: "memory_cards",
  MATCHES: "memory_matches",
  IS_CHECKING: "memory_is_checking",
  GAME_STATE: "memory_game_state"
}

type GameState = "ready" | "playing" | "complete"

// Define card icons and colors
const CARD_CONFIGS = [
  { icon: Heart, color: "text-rose-500" },
  { icon: Star, color: "text-amber-500" },
  { icon: Sun, color: "text-yellow-500" },
  { icon: Moon, color: "text-purple-500" },
  { icon: Cloud, color: "text-sky-500" },
  { icon: Flower2, color: "text-emerald-500" }
];

// Creates a new shuffled deck of cards
const createCards = () => {
  const cards: MemoryCard[] = []

  CARD_CONFIGS.forEach(({ icon, color }, index) => {
    // Create a pair of cards for each icon
    cards.push(
      { id: index * 2, icon, color, isMatched: false, isFlipped: false },
      { id: index * 2 + 1, icon, color, isMatched: false, isFlipped: false }
    )
  })

  // Shuffle the cards
  return cards.sort(() => Math.random() - 0.5)
}

// CSS styles for the memory game
const MEMORY_GAME_STYLES = `
  .memory-card {
    position: relative;
    width: 100%;
    height: 100%;
    cursor: pointer;
    transform-style: preserve-3d;
    transition: transform 0.5s;
  }
  
  .memory-card.flipped {
    transform: rotateY(180deg);
  }
  
  .card-face {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.375rem;
  }
  
  .card-face.back {
    transform: rotateY(180deg);
  }
  
  @media (prefers-reduced-motion) {
    .memory-card {
      transition: none;
    }
    .memory-card.flipped .card-face.front {
      opacity: 0;
    }
    .memory-card.flipped .card-face.back {
      opacity: 1;
    }
    .card-face.back {
      opacity: 0;
      transform: none;
    }
  }
`;

export default function MemoryGame({ onComplete }: MemoryGameProps) {
  const [gameState, setGameState] = useState<GameState>("ready");
  const [cards, setCards] = useState<MemoryCard[]>(createCards());
  const [matches, setMatches] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  
  // Add CSS styles
  useEffect(() => {
    const styleId = 'memory-game-styles';
    if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = MEMORY_GAME_STYLES;
      document.head.appendChild(styleEl);
      
      return () => {
        const element = document.getElementById(styleId);
        if (element) document.head.removeChild(element);
      };
    }
  }, []);
  
  // Load game state from session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedGameState = sessionStorage.getItem(MEMORY_STORAGE_KEYS.GAME_STATE);
        const savedMatches = sessionStorage.getItem(MEMORY_STORAGE_KEYS.MATCHES);
        const savedCards = sessionStorage.getItem(MEMORY_STORAGE_KEYS.CARDS);
        
        if (savedGameState) {
          setGameState(savedGameState as GameState);
        }
        
        if (savedMatches) {
          setMatches(parseInt(savedMatches));
        }
        
        if (savedCards) {
          // We need to restore the card objects which include functions
          const parsedCards = JSON.parse(savedCards);
          const restoredCards = parsedCards.map((card: any) => {
            const iconConfig = CARD_CONFIGS.find((_, i) => Math.floor(card.id / 2) === i);
            return {
              ...card,
              icon: iconConfig?.icon || Heart
            };
          });
          setCards(restoredCards);
        }
      } catch (error) {
        console.error("Error loading Memory Game from session storage:", error);
      }
    }
  }, []);
  
  // Save game state to session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(MEMORY_STORAGE_KEYS.GAME_STATE, gameState);
        sessionStorage.setItem(MEMORY_STORAGE_KEYS.MATCHES, matches.toString());
        
        // Save card state without the icon function
        const serializableCards = cards.map(card => ({
          ...card,
          icon: undefined,
          iconIndex: Math.floor(card.id / 2) // Store index to identify icon
        }));
        sessionStorage.setItem(MEMORY_STORAGE_KEYS.CARDS, JSON.stringify(serializableCards));
        sessionStorage.setItem(MEMORY_STORAGE_KEYS.IS_CHECKING, isChecking.toString());
      } catch (error) {
        console.error("Error saving Memory Game to session storage:", error);
      }
    }
  }, [gameState, matches, cards, isChecking]);

  // Clear session storage
  const clearSessionStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      Object.values(MEMORY_STORAGE_KEYS).forEach(key => {
        sessionStorage.removeItem(key);
      });
    }
  }, []);

  const handleCardClick = (clickedIndex: number) => {
    // Prevent clicks if we're checking for a match or the card is already matched
    if (isChecking || cards[clickedIndex].isMatched || cards[clickedIndex].isFlipped) {
      return;
    }
    
    // Create new cards array with the clicked card flipped
    const newCards = [...cards];
    newCards[clickedIndex] = {
      ...newCards[clickedIndex],
      isFlipped: true
    };
    setCards(newCards);
    
    // Check if we now have 2 cards flipped
    const flippedCards = newCards.filter(card => card.isFlipped && !card.isMatched);
    
    if (flippedCards.length === 2) {
      setIsChecking(true);
      
      // Check for a match
      const [firstCard, secondCard] = flippedCards;
      const isMatch = Math.floor(firstCard.id / 2) === Math.floor(secondCard.id / 2);
      
      setTimeout(() => {
        let updatedCards;
        if (isMatch) {
          // Match found - mark both cards as matched
          updatedCards = newCards.map(card => 
            card.isFlipped && !card.isMatched 
              ? { ...card, isMatched: true }
              : card
          );
          setMatches(matches + 1);
          
          // Check if game is complete
          if (matches + 1 === CARD_CONFIGS.length) {
            setGameState("complete");
          }
        } else {
          // No match - flip cards back
          updatedCards = newCards.map(card => 
            card.isFlipped && !card.isMatched
              ? { ...card, isFlipped: false }
              : card
          );
        }
        
        setCards(updatedCards);
        setIsChecking(false);
      }, 800);
    }
  };

  const startGame = useCallback(() => {
    setGameState("playing");
    setCards(createCards());
    setMatches(0);
    setIsChecking(false);
    clearSessionStorage();
  }, [clearSessionStorage]);

  const handleComplete = () => {
    // Calculate score based on matches
    const score = matches * 100;
    clearSessionStorage();
    onComplete(score);
  };

  return (
    <Card className="w-full p-6 shadow-xl bg-white">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-[#1E3A8A] mb-2">Memory Match</h1>
        <p className="text-gray-600">
          Game 5 of 6: Find all matching pairs of cards!
        </p>
      </div>

      {gameState === "ready" && (
        <div className="text-center space-y-6">
          <div className="bg-[#F3F4F6] p-4 rounded-lg">
            <p className="mb-4">
              Test your memory by finding all matching pairs of cards. Try to complete the game with as few moves as possible!
            </p>
          </div>
          <Button onClick={startGame} className="w-full py-6 text-lg bg-[#1E3A8A] hover:bg-[#1E40AF]">
            Start Game
          </Button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="font-medium">Matches: {matches}/{CARD_CONFIGS.length}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {cards.map((card, index) => (
              <div key={card.id} className="aspect-square h-24 md:h-28" onClick={() => handleCardClick(index)}>
                <div className={`memory-card ${card.isFlipped || card.isMatched ? 'flipped' : ''}`}>
                  <div className="card-face front bg-[#F3F4F6] border border-[#E5E7EB] hover:border-[#1E3A8A] hover:bg-[#EDF2F7] rounded-md">
                    {/* Card back - question mark or pattern */}
                    <div className="text-[#CBD5E1] text-2xl">?</div>
                  </div>
                  <div className={`card-face back ${card.isMatched ? 'bg-indigo-900/50 border-indigo-400/50' : 'bg-indigo-800/50 border-indigo-500/50'} rounded-md`}>
                    {/* Card front - icon */}
                    <card.icon 
                      className={`w-10 h-10 ${card.color} ${card.isMatched ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {gameState === "complete" && (
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-[#1E3A8A]">Game Complete!</h2>

          <div className="bg-[#F3F4F6] p-6 rounded-lg">
            <div className="mb-4">
              <p className="text-lg font-semibold">Your Score</p>
              <p className="text-4xl font-bold text-[#E53E3E]">{matches * 100}</p>
            </div>
            
            <div className="text-sm">
              <p className="font-medium">Matches Found</p>
              <p className="text-xl font-bold text-[#10B981]">{matches}/{CARD_CONFIGS.length}</p>
            </div>
          </div>

          <Button
            onClick={handleComplete}
            className="w-full py-6 text-lg bg-[#1E3A8A] hover:bg-[#1E40AF] flex items-center justify-center"
          >
            Next Game: Word Puzzle
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
    </Card>
  )
}

