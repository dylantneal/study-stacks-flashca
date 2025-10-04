import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Plus, BookOpen, PencilSimple, Trash, Play, ArrowCounterClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

interface FlashCard {
  id: string
  term: string
  definition: string
  difficulty: number
  lastStudied?: Date
}

interface Deck {
  id: string
  name: string
  description: string
  cards: FlashCard[]
  created: Date
}

function App() {
  const [decks, setDecks] = useKV<Deck[]>('flashcard-decks', [])
  const [currentView, setCurrentView] = useState<'dashboard' | 'study' | 'deck'>('dashboard')
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [studySession, setStudySession] = useState<{
    cards: FlashCard[]
    currentIndex: number
    showAnswer: boolean
    completed: number
  } | null>(null)
  const [deckDialogOpen, setDeckDialogOpen] = useState(false)
  const [cardDialogOpen, setCardDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<FlashCard | null>(null)
  const [newDeck, setNewDeck] = useState({ name: '', description: '' })
  const [newCard, setNewCard] = useState({ term: '', definition: '' })

  const createDeck = () => {
    if (!newDeck.name.trim()) return
    
    const deck: Deck = {
      id: Date.now().toString(),
      name: newDeck.name,
      description: newDeck.description,
      cards: [],
      created: new Date()
    }
    
    setDecks(current => [...(current || []), deck])
    setNewDeck({ name: '', description: '' })
    setDeckDialogOpen(false)
  }

  const deleteDeck = (deckId: string) => {
    setDecks(current => (current || []).filter(d => d.id !== deckId))
    if (selectedDeck?.id === deckId) {
      setSelectedDeck(null)
      setCurrentView('dashboard')
    }
  }

  const addCard = () => {
    if (!newCard.term.trim() || !newCard.definition.trim() || !selectedDeck) return
    
    const card: FlashCard = {
      id: Date.now().toString(),
      term: newCard.term,
      definition: newCard.definition,
      difficulty: 0
    }
    
    const updatedDeck = {
      ...selectedDeck,
      cards: [...selectedDeck.cards, card]
    }
    
    setDecks(current => (current || []).map(d => d.id === selectedDeck.id ? updatedDeck : d))
    setSelectedDeck(updatedDeck)
    setNewCard({ term: '', definition: '' })
    setCardDialogOpen(false)
  }

  const updateCard = () => {
    if (!editingCard || !newCard.term.trim() || !newCard.definition.trim() || !selectedDeck) return
    
    const updatedDeck = {
      ...selectedDeck,
      cards: selectedDeck.cards.map(c => 
        c.id === editingCard.id 
          ? { ...c, term: newCard.term, definition: newCard.definition }
          : c
      )
    }
    
    setDecks(current => (current || []).map(d => d.id === selectedDeck.id ? updatedDeck : d))
    setSelectedDeck(updatedDeck)
    setEditingCard(null)
    setNewCard({ term: '', definition: '' })
    setCardDialogOpen(false)
  }

  const deleteCard = (cardId: string) => {
    if (!selectedDeck) return
    
    const updatedDeck = {
      ...selectedDeck,
      cards: selectedDeck.cards.filter(c => c.id !== cardId)
    }
    
    setDecks(current => (current || []).map(d => d.id === selectedDeck.id ? updatedDeck : d))
    setSelectedDeck(updatedDeck)
  }

  const startStudy = (deck: Deck) => {
    if (deck.cards.length === 0) return
    
    const shuffledCards = [...deck.cards].sort(() => Math.random() - 0.5)
    setStudySession({
      cards: shuffledCards,
      currentIndex: 0,
      showAnswer: false,
      completed: 0
    })
    setSelectedDeck(deck)
    setCurrentView('study')
  }

  const nextCard = (difficulty?: number) => {
    if (!studySession) return
    
    if (difficulty !== undefined && studySession.currentIndex < studySession.cards.length) {
      const currentCard = studySession.cards[studySession.currentIndex]
      currentCard.difficulty = difficulty
      currentCard.lastStudied = new Date()
    }
    
    if (studySession.currentIndex < studySession.cards.length - 1) {
      setStudySession({
        ...studySession,
        currentIndex: studySession.currentIndex + 1,
        showAnswer: false,
        completed: studySession.completed + 1
      })
    } else {
      setStudySession(null)
      setCurrentView('dashboard')
    }
  }

  const progress = studySession 
    ? ((studySession.completed / studySession.cards.length) * 100)
    : 0

  if (currentView === 'study' && studySession) {
    const currentCard = studySession.cards[studySession.currentIndex]
    
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                onClick={() => {
                  setStudySession(null)
                  setCurrentView('dashboard')
                }}
              >
                <ArrowCounterClockwise className="w-4 h-4 mr-2" />
                Exit Study
              </Button>
              <div className="text-sm text-muted-foreground">
                {studySession.completed + 1} of {studySession.cards.length}
              </div>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
          
          <Card className="min-h-[400px] cursor-pointer transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-8 h-full flex flex-col justify-center items-center text-center">
              {!studySession.showAnswer ? (
                <div onClick={() => setStudySession({ ...studySession, showAnswer: true })}>
                  <h2 className="text-2xl font-semibold mb-4">Term</h2>
                  <p className="text-3xl font-bold text-primary">{currentCard.term}</p>
                  <p className="text-sm text-muted-foreground mt-8">Click to reveal definition</p>
                </div>
              ) : (
                <div className="w-full">
                  <h2 className="text-2xl font-semibold mb-4">Definition</h2>
                  <p className="text-lg leading-relaxed mb-8">{currentCard.definition}</p>
                  
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => nextCard(1)}
                      className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                    >
                      Hard
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => nextCard(2)}
                      className="bg-warning text-warning-foreground"
                    >
                      Medium
                    </Button>
                    <Button
                      onClick={() => nextCard(3)}
                      className="bg-success text-success-foreground"
                    >
                      Easy
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (currentView === 'deck' && selectedDeck) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => setCurrentView('dashboard')}
            >
              ← Back to Decks
            </Button>
            <div className="flex gap-2">
              <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Card
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCard ? 'Edit Card' : 'Add New Card'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="term">Term</Label>
                      <Input
                        id="term"
                        value={newCard.term}
                        onChange={(e) => setNewCard({ ...newCard, term: e.target.value })}
                        placeholder="Enter the term or concept"
                      />
                    </div>
                    <div>
                      <Label htmlFor="definition">Definition</Label>
                      <Textarea
                        id="definition"
                        value={newCard.definition}
                        onChange={(e) => setNewCard({ ...newCard, definition: e.target.value })}
                        placeholder="Enter the definition or explanation"
                        rows={4}
                      />
                    </div>
                    <Button onClick={editingCard ? updateCard : addCard} className="w-full">
                      {editingCard ? 'Update Card' : 'Add Card'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {selectedDeck.cards.length > 0 && (
                <Button onClick={() => startStudy(selectedDeck)} className="bg-accent text-accent-foreground">
                  <Play className="w-4 h-4 mr-2" />
                  Study Now
                </Button>
              )}
            </div>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">{selectedDeck.name}</CardTitle>
              <CardDescription>{selectedDeck.description}</CardDescription>
              <div className="flex gap-4 mt-4">
                <Badge variant="secondary">{selectedDeck.cards.length} cards</Badge>
                <Badge variant="outline">
                  Created {new Date(selectedDeck.created).toLocaleDateString()}
                </Badge>
              </div>
            </CardHeader>
          </Card>
          
          {selectedDeck.cards.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No cards yet</h3>
                <p className="text-muted-foreground mb-4">Add your first card to start studying</p>
                <Button onClick={() => setCardDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Card
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {selectedDeck.cards.map((card) => (
                <Card key={card.id} className="transition-all hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{card.term}</h3>
                        <p className="text-muted-foreground">{card.definition}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCard(card)
                            setNewCard({ term: card.term, definition: card.definition })
                            setCardDialogOpen(true)
                          }}
                        >
                          <PencilSimple className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                              <Trash className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Card</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this card? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCard(card.id)} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const decksList = decks || []

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">FlashForge</h1>
            <p className="text-xl text-muted-foreground">GitHub Solutions Engineer Vocabulary</p>
          </div>
          
          <Dialog open={deckDialogOpen} onOpenChange={setDeckDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Create Deck
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Deck</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="deckName">Deck Name</Label>
                  <Input
                    id="deckName"
                    value={newDeck.name}
                    onChange={(e) => setNewDeck({ ...newDeck, name: e.target.value })}
                    placeholder="e.g., GitHub Advanced Security"
                  />
                </div>
                <div>
                  <Label htmlFor="deckDescription">Description</Label>
                  <Textarea
                    id="deckDescription"
                    value={newDeck.description}
                    onChange={(e) => setNewDeck({ ...newDeck, description: e.target.value })}
                    placeholder="Brief description of what this deck covers"
                    rows={3}
                  />
                </div>
                <Button onClick={createDeck} className="w-full">
                  Create Deck
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {decksList.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <BookOpen className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-4">Welcome to FlashForge</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create your first deck to start studying GitHub Solutions Engineer vocabulary with spaced repetition.
              </p>
              <Button onClick={() => setDeckDialogOpen(true)} className="bg-accent text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Deck
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decksList.map((deck) => (
              <Card key={deck.id} className="transition-all hover:shadow-lg cursor-pointer group">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1" onClick={() => {
                      setSelectedDeck(deck)
                      setCurrentView('deck')
                    }}>
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {deck.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {deck.description}
                      </CardDescription>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive hover:text-destructive-foreground">
                          <Trash className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Deck</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{deck.name}"? This will permanently delete all cards in this deck.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteDeck(deck.id)} className="bg-destructive text-destructive-foreground">
                            Delete Deck
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-2">
                      <Badge variant="secondary">{deck.cards.length} cards</Badge>
                      <Badge variant="outline">
                        {new Date(deck.created).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedDeck(deck)
                        setCurrentView('deck')
                      }}
                    >
                      <PencilSimple className="w-4 h-4 mr-2" />
                      Manage
                    </Button>
                    <Button
                      className="flex-1 bg-primary text-primary-foreground"
                      onClick={() => startStudy(deck)}
                      disabled={deck.cards.length === 0}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Study
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App