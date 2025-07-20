import { GameAgent, AgentConfig } from './types';
import { AlgorithmicAgent } from './algorithmicAgent';

export type AgentType = 'algorithmic' | 'local-ml' | 'cloud' | 'hybrid';

export class AgentManager {
  private agents: Map<string, GameAgent> = new Map();
  private activeAgent: GameAgent | null = null;
  
  async loadAgent(type: AgentType, config: AgentConfig = {}): Promise<GameAgent> {
    // Create agent based on type
    let agent: GameAgent;
    
    switch (type) {
      case 'algorithmic':
        agent = new AlgorithmicAgent(config);
        break;
        
      case 'local-ml':
        // Placeholder for future ML agent
        throw new Error('Local ML agents not yet implemented');
        
      case 'cloud':
        // Placeholder for future cloud agent
        throw new Error('Cloud agents not yet implemented');
        
      case 'hybrid':
        // Placeholder for future hybrid agent
        throw new Error('Hybrid agents not yet implemented');
        
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
    
    // Initialize the agent
    await agent.initialize();
    
    // Store agent
    const id = `${type}-${Date.now()}`;
    this.agents.set(id, agent);
    
    return agent;
  }
  
  setActiveAgent(agent: GameAgent | null): void {
    // Deactivate previous agent if any
    if (this.activeAgent && this.activeAgent !== agent) {
      // Stop any ongoing activities
      if ('stopPlaying' in this.activeAgent) {
        (this.activeAgent as AlgorithmicAgent).stopPlaying();
      }
    }
    
    this.activeAgent = agent;
  }
  
  getActiveAgent(): GameAgent | null {
    return this.activeAgent;
  }
  
  getAllAgents(): GameAgent[] {
    return Array.from(this.agents.values());
  }
  
  destroyAgent(agent: GameAgent): void {
    agent.destroy();
    
    // Remove from storage
    for (const [id, storedAgent] of this.agents) {
      if (storedAgent === agent) {
        this.agents.delete(id);
        break;
      }
    }
    
    // Clear active if it was this agent
    if (this.activeAgent === agent) {
      this.activeAgent = null;
    }
  }
  
  destroyAllAgents(): void {
    for (const agent of this.agents.values()) {
      agent.destroy();
    }
    this.agents.clear();
    this.activeAgent = null;
  }
}