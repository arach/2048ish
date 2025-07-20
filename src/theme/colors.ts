// Theme configuration for 2048
// Easy to customize and maintain

export const theme = {
  // Background colors
  background: {
    main: '#FAF8F3', // Warm tan/cream background
    gradient: {
      from: '#FAF8F3',
      to: '#F5F0E8'
    }
  },
  
  // Game board colors
  board: {
    background: '#BBADA0',
    grid: '#CDC1B4',
    empty: '#EEE4DA'
  },
  
  // UI elements
  ui: {
    card: {
      background: '#FFFFFF',
      shadow: 'rgba(0, 0, 0, 0.08)'
    },
    button: {
      primary: {
        background: '#F59563',
        hover: '#F37C47',
        active: '#E66B35',
        text: '#FFFFFF'
      },
      secondary: {
        background: '#EEE4DA',
        hover: '#E6DDD1',
        active: '#DED4C8',
        text: '#776E65',
        disabled: {
          background: '#F5F0E8',
          text: '#CCC5BD'
        }
      }
    },
    text: {
      primary: '#776E65',
      secondary: '#8F8781',
      light: '#B8AFA6'
    }
  },
  
  // Tile colors
  tiles: {
    2: { background: '#EEE4DA', text: '#776E65' },
    4: { background: '#EDE0C8', text: '#776E65' },
    8: { background: '#F2B179', text: '#F9F6F2' },
    16: { background: '#F59563', text: '#F9F6F2' },
    32: { background: '#F67C5F', text: '#F9F6F2' },
    64: { background: '#F65E3B', text: '#F9F6F2' },
    128: { background: '#EDCF72', text: '#F9F6F2' },
    256: { background: '#EDCC61', text: '#F9F6F2' },
    512: { background: '#EDC850', text: '#F9F6F2' },
    1024: { background: '#EDC53F', text: '#F9F6F2' },
    2048: { background: '#EDC22E', text: '#F9F6F2' },
    // Higher values
    4096: { background: '#3C3A32', text: '#F9F6F2' },
    8192: { background: '#3C3A32', text: '#F9F6F2' }
  }
};

// Helper function to get tile style
export function getTileStyle(value: number) {
  const style = theme.tiles[value as keyof typeof theme.tiles];
  if (style) return style;
  
  // For values higher than defined, use a default dark style
  return { background: '#3C3A32', text: '#F9F6F2' };
}

// CSS custom properties for easy theming
export const cssVariables = `
  :root {
    /* Background */
    --bg-main: ${theme.background.main};
    --bg-gradient-from: ${theme.background.gradient.from};
    --bg-gradient-to: ${theme.background.gradient.to};
    
    /* Board */
    --board-bg: ${theme.board.background};
    --board-grid: ${theme.board.grid};
    --board-empty: ${theme.board.empty};
    
    /* UI */
    --card-bg: ${theme.ui.card.background};
    --card-shadow: ${theme.ui.card.shadow};
    
    --btn-primary-bg: ${theme.ui.button.primary.background};
    --btn-primary-hover: ${theme.ui.button.primary.hover};
    --btn-primary-active: ${theme.ui.button.primary.active};
    --btn-primary-text: ${theme.ui.button.primary.text};
    
    --btn-secondary-bg: ${theme.ui.button.secondary.background};
    --btn-secondary-hover: ${theme.ui.button.secondary.hover};
    --btn-secondary-active: ${theme.ui.button.secondary.active};
    --btn-secondary-text: ${theme.ui.button.secondary.text};
    --btn-secondary-disabled-bg: ${theme.ui.button.secondary.disabled.background};
    --btn-secondary-disabled-text: ${theme.ui.button.secondary.disabled.text};
    
    --text-primary: ${theme.ui.text.primary};
    --text-secondary: ${theme.ui.text.secondary};
    --text-light: ${theme.ui.text.light};
  }
`;