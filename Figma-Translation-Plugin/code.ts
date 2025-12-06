// Figma Translation Plugin - Main Code
// This plugin extracts text from selected frames, exports to Excel, and applies translations

figma.showUI(__html__, { width: 500, height: 600 });

interface TextNodeData {
  id: string;
  nodeId: string;
  text: string;
  characters: string;
  // Font properties
  fontName: any; // Changed to any to handle serialization
  fontSize: number | string; // String for "mixed"
  fontWeight: string;
  // Text properties
  textAlignHorizontal: string;
  textAlignVertical: string;
  textAutoResize: string;
  // Color properties
  fills: any;
  // Layout properties
  width: number;
  height: number;
  // Character count
  characterCount: number;
  // Letter spacing and line height
  letterSpacing: any;
  lineHeight: any;
  // Text decoration
  textDecoration: string;
  textCase: string;
  // Hyperlink
  hyperlink: any;
  hasHyperlink: boolean;
}

// Handle messages from UI
figma.ui.onmessage = async (msg: { type: string; data?: any }) => {
  
  if (msg.type === 'extract-text') {
    await extractTextFromSelection();
  }
  
  if (msg.type === 'apply-translations') {
    await applyTranslations(msg.data);
  }
  
  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};

// Helper function to serialize values that might be symbols
function serializeValue(value: any): any {
  if (value === figma.mixed) {
    return "MIXED";
  }
  return value;
}

// Helper function to extract hyperlink information
function extractHyperlinkInfo(node: TextNode): any {
  try {
    // Check if there are any hyperlinks in the text
    const textLength = node.characters.length;
    const hyperlinks: any[] = [];
    
    // Sample check at different positions to find hyperlinks
    for (let i = 0; i < textLength; i++) {
      const range = { start: i, end: i + 1 };
      const link = node.getRangeHyperlink(range.start, range.end);
      
      // Check if link is not null and not the mixed symbol
      if (link && link !== figma.mixed) {
        const hyperlinkTarget = link as HyperlinkTarget;
        
        if (hyperlinkTarget.type === 'URL') {
          // Check if we already captured this link
          const existingLink = hyperlinks.find(h => h.url === hyperlinkTarget.value && h.start === i);
          if (!existingLink) {
            hyperlinks.push({
              type: 'URL',
              url: hyperlinkTarget.value,
              start: i,
              end: i + 1
            });
          }
        }
      }
    }
    
    if (hyperlinks.length > 0) {
      return {
        hasLinks: true,
        links: hyperlinks
      };
    }
    
    return {
      hasLinks: false,
      links: []
    };
  } catch (error) {
    return {
      hasLinks: false,
      links: [],
      error: String(error)
    };
  }
}

// Extract all text nodes from selected frame
async function extractTextFromSelection() {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'error',
      message: 'Please select a frame to extract text from.'
    });
    return;
  }
  
  if (selection.length > 1) {
    figma.ui.postMessage({
      type: 'error',
      message: 'Please select only one frame at a time.'
    });
    return;
  }
  
  const selectedNode = selection[0];
  const textNodes: TextNodeData[] = [];
  let extractionCounter = 1;
  
  // Recursively find all text nodes
  function findTextNodes(node: SceneNode) {
    if (node.type === 'TEXT') {
      // Get font weight as string
      let fontWeight = "Regular";
      let fontNameSerialized: any = null;
      
      if (node.fontName !== figma.mixed) {
        const fontName = node.fontName as FontName;
        fontWeight = fontName.style;
        fontNameSerialized = {
          family: fontName.family,
          style: fontName.style
        };
      } else {
        fontNameSerialized = "MIXED";
      }
      
      // Extract hyperlink information
      const hyperlinkInfo = extractHyperlinkInfo(node);
      
      textNodes.push({
        id: `TXT_${extractionCounter.toString().padStart(4, '0')}`,
        nodeId: node.id,
        text: node.characters,
        characters: node.characters,
        // Font properties - serialized
        fontName: fontNameSerialized,
        fontSize: serializeValue(node.fontSize),
        fontWeight: fontWeight,
        // Text properties - serialized
        textAlignHorizontal: serializeValue(node.textAlignHorizontal),
        textAlignVertical: serializeValue(node.textAlignVertical),
        textAutoResize: serializeValue(node.textAutoResize),
        // Color properties
        fills: serializeValue(node.fills),
        // Layout properties
        width: node.width,
        height: node.height,
        // Character count
        characterCount: node.characters.length,
        // Letter spacing and line height - serialized
        letterSpacing: serializeValue(node.letterSpacing),
        lineHeight: serializeValue(node.lineHeight),
        // Text decoration - serialized
        textDecoration: serializeValue(node.textDecoration),
        textCase: serializeValue(node.textCase),
        // Hyperlink - serialized
        hyperlink: hyperlinkInfo,
        hasHyperlink: hyperlinkInfo.hasLinks
      });
      extractionCounter++;
    }
    
    if ('children' in node) {
      for (const child of node.children) {
        findTextNodes(child);
      }
    }
  }
  
  findTextNodes(selectedNode);
  
  if (textNodes.length === 0) {
    figma.ui.postMessage({
      type: 'error',
      message: 'No text found in the selected frame.'
    });
    return;
  }
  
  // Send extracted text to UI
  figma.ui.postMessage({
    type: 'text-extracted',
    data: textNodes,
    count: textNodes.length
  });
  
  figma.notify(`✓ Extracted ${textNodes.length} text element(s)`);
}

// Apply translations to text nodes
async function applyTranslations(translations: Array<{
  id: string, 
  originalText: string, 
  translation: string, 
  nodeId: string,
  metadata: TextNodeData
}>) {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const item of translations) {
    try {
      // Find the node by ID using async method
      const node = await figma.getNodeByIdAsync(item.nodeId) as TextNode;
      
      if (!node || node.type !== 'TEXT') {
        errors.push(`Node not found for ID: ${item.id}`);
        errorCount++;
        continue;
      }
      
      // Verify original text matches
      if (node.characters !== item.originalText) {
        errors.push(`Text mismatch for ${item.id}. Expected: "${item.originalText}", Found: "${node.characters}"`);
        errorCount++;
        continue;
      }
      
      // Check if translation is longer than original
      const originalLength = item.originalText.length;
      const translationLength = item.translation.length;
      
      if (translationLength > originalLength * 1.5) {
        warnings.push(`${item.id}: Translation is ${Math.round((translationLength/originalLength - 1) * 100)}% longer. May cause overflow.`);
      }
      
      // Load font before changing text
      if (item.metadata.fontName !== "MIXED" && item.metadata.fontName !== null) {
        await figma.loadFontAsync(item.metadata.fontName as FontName);
      } else {
        if (node.fontName !== figma.mixed) {
          await figma.loadFontAsync(node.fontName as FontName);
        }
      }
      
      // Apply translation
      node.characters = item.translation;
      
      // Restore hyperlinks if they existed
      if (item.metadata.hasHyperlink && item.metadata.hyperlink.hasLinks) {
        try {
          const links = item.metadata.hyperlink.links;
          for (const link of links) {
            if (link.type === 'URL' && link.url) {
              // Apply hyperlink to the same range
              // Note: This assumes the translated text has similar structure
              // You may need to adjust ranges based on translation length
              const start = Math.min(link.start, node.characters.length - 1);
              const end = Math.min(link.end, node.characters.length);
              
              if (start >= 0 && end > start) {
                node.setRangeHyperlink(start, end, { type: 'URL', value: link.url });
              }
            }
          }
        } catch (linkError) {
          warnings.push(`${item.id}: Could not restore hyperlinks - ${linkError}`);
        }
      }
      
      successCount++;
      
    } catch (error) {
      errors.push(`Error applying translation for ${item.id}: ${error}`);
      errorCount++;
    }
  }
  
  // Send results back to UI
  figma.ui.postMessage({
    type: 'translation-applied',
    successCount,
    errorCount,
    errors,
    warnings
  });
  
  if (successCount > 0) {
    figma.notify(`✓ Applied ${successCount} translation(s) successfully`);
  }
  
  if (errorCount > 0) {
    figma.notify(`⚠ ${errorCount} translation(s) failed. Check the plugin for details.`, { error: true });
  }
  
  if (warnings.length > 0) {
    figma.notify(`⚠ ${warnings.length} text(s) may overflow. Check the plugin for details.`, { timeout: 5000 });
  }
} 