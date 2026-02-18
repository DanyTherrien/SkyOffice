// Service pour le bot IA du brainstorm
// Utilise l'API Claude/OpenAI pour generer des reponses creatives

const AI_API_URL = process.env.AI_BOT_API_URL || ''
const AI_API_KEY = process.env.AI_BOT_API_KEY || ''
export const AI_BOT_NAME = 'Crea'

const SYSTEM_PROMPT = `Tu es Crea, un assistant creatif qui participe aux sessions de brainstorming.
Tu es enthousiaste, creatif, et tu aides l'equipe a generer des idees.
Tu peux:
- Generer des idees a partir d'un theme
- Faire du "Yes, and..." (technique d'impro)
- Jouer le devil's advocate
- Structurer les idees en categories
- Proposer des analogies et metaphores
- Resumer la session
Reponds en francais, de maniere concise (2-3 phrases max).
Sois creatif et encourageant.`

export class AiBotService {
  private conversationHistory: Array<{ role: string; content: string }> = []

  isConfigured(): boolean {
    return !!(AI_API_URL && AI_API_KEY)
  }

  async generateResponse(userMessage: string, userName: string): Promise<string> {
    if (!this.isConfigured()) {
      return this.getFallbackResponse()
    }

    this.conversationHistory.push({ role: 'user', content: `${userName}: ${userMessage}` })

    // Garder seulement les 20 derniers messages pour le contexte
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20)
    }

    try {
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_API_KEY}`,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          messages: this.conversationHistory.map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        }),
      })

      const data = await response.json()
      const botResponse = data.content?.[0]?.text || this.getFallbackResponse()
      this.conversationHistory.push({ role: 'assistant', content: botResponse })
      return botResponse
    } catch (error) {
      console.error('AI Bot error:', error)
      return this.getFallbackResponse()
    }
  }

  // Reponses de secours quand aucune API n'est configuree
  private getFallbackResponse(): string {
    const responses = [
      "Interessant! Et si on poussait cette idee encore plus loin?",
      "J'aime la direction! Qu'est-ce qui se passerait si on faisait l'inverse?",
      "Bonne reflexion. Essayons de voir ca sous un autre angle.",
      "Oui, et en plus on pourrait ajouter une dimension inattendue!",
      "Ca me fait penser a une analogie: c'est comme... Hmm, aidez-moi a completer!",
      "Et si on combinait cette idee avec la precedente?",
      "Pas mal! Quels seraient les obstacles? Transformons-les en opportunites.",
      "Imaginons qu'on n'a aucune contrainte. Que ferait-on?",
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  clearHistory(): void {
    this.conversationHistory = []
  }
}
