// Figma Translation Plugin - Main Code
// This plugin extracts text from selected frames, exports to Excel, and applies translations

figma.showUI(__html__, { width: 500, height: 600 });

interface TextNodeData {
  id: string;
  nodeId: string;
  text: string;
  fontName: any;
  fontSize: number;
  characters: string;
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
      textNodes.push({
        id: `TXT_${extractionCounter.toString().padStart(4, '0')}`,
        nodeId: node.id,
        text: node.characters,
        fontName: node.fontName,
        fontSize: node.fontSize as number,
        characters: node.characters
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
async function applyTranslations(translations: Array<{id: string, originalText: string, translation: string, nodeId: string}>) {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  
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
      
      // Load font before changing text
      await figma.loadFontAsync(node.fontName as FontName);
      
      // Apply translation
      node.characters = item.translation;
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
    errors
  });
  
  if (successCount > 0) {
    figma.notify(`✓ Applied ${successCount} translation(s) successfully`);
  }
  
  if (errorCount > 0) {
    figma.notify(`⚠ ${errorCount} translation(s) failed. Check the plugin for details.`, { error: true });
  }
}