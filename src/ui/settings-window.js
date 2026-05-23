document.addEventListener('DOMContentLoaded', () => {    
    // Get DOM elements
    const closeButton = document.getElementById('closeButton');
    const quitButton = document.getElementById('quitButton');
    const azureKeyInput = document.getElementById('azureKey');
    const azureRegionInput = document.getElementById('azureRegion');
    const geminiKeyInput = document.getElementById('geminiKey');
    const windowGapInput = document.getElementById('windowGap');
    const codingLanguageSelect = document.getElementById('codingLanguage');
    const activeSkillSelect = document.getElementById('activeSkill');
    const iconGrid = document.getElementById('iconGrid');

    // Check if window.api exists
    if (!window.api) {
        console.error('window.api not available');
        return;
    }

    // Request current settings when window opens
    const requestCurrentSettings = () => {
        if (window.electronAPI && window.electronAPI.getSettings) {
            window.electronAPI.getSettings().then(settings => {
                loadSettingsIntoUI(settings);
            }).catch(error => {
                console.error('Failed to get settings:', error);
            });
        }
    };

    // Close button handler
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            window.api.send('close-settings');
        });
    }

    // Quit button handler with multiple attempts
    if (quitButton) {
        quitButton.addEventListener('click', () => {
            try {
                // Try multiple ways to quit the app
                if (window.api && window.api.send) {
                    window.api.send('quit-app');
                }
                
                // Also try the electron API if available
                if (window.electronAPI && window.electronAPI.quit) {
                    window.electronAPI.quit();
                }
                
                // Fallback: close the window
                setTimeout(() => {
                    window.close();
                }, 500);
                
            } catch (error) {
                console.error('Error quitting app:', error);
                window.close();
            }
        });
    }

    // Function to load settings into UI
    const loadSettingsIntoUI = (settings) => {
        if (settings.azureKey && azureKeyInput) azureKeyInput.value = settings.azureKey;
        if (settings.azureRegion && azureRegionInput) azureRegionInput.value = settings.azureRegion;
        if (settings.geminiKey && geminiKeyInput) geminiKeyInput.value = settings.geminiKey;
        if (settings.windowGap && windowGapInput) windowGapInput.value = settings.windowGap;
        if (settings.codingLanguage && codingLanguageSelect) codingLanguageSelect.value = settings.codingLanguage;
        if (settings.activeSkill && activeSkillSelect) activeSkillSelect.value = settings.activeSkill;
        
        // Local LLM settings
        if (localLLMEndpointInput && settings.localLLMEndpoint) localLLMEndpointInput.value = settings.localLLMEndpoint;
        if (localLLMModelInput && settings.localLLMModel) localLLMModelInput.value = settings.localLLMModel;
        
        // Browser LLM settings
        if (browserLLMPlatformSelect && settings.browserLLMPlatform) {
            browserLLMPlatformSelect.value = settings.browserLLMPlatform;
            // Show/hide custom URL input
            if (customUrlItem) {
                customUrlItem.style.display = settings.browserLLMPlatform === 'custom' ? 'flex' : 'none';
            }
        }
        if (browserLLMCustomUrlInput && settings.browserLLMCustomUrl) browserLLMCustomUrlInput.value = settings.browserLLMCustomUrl;
        if (browserLLMHeadlessCheckbox && settings.browserLLMHeadless !== undefined) {
            browserLLMHeadlessCheckbox.checked = settings.browserLLMHeadless;
        }
        
        // Whisper settings
        if (whisperModelSelect && settings.whisperModel) whisperModelSelect.value = settings.whisperModel;
        if (whisperLanguageSelect && settings.whisperLanguage) whisperLanguageSelect.value = settings.whisperLanguage;
        if (whisperDeviceSelect && settings.whisperDevice) whisperDeviceSelect.value = settings.whisperDevice;
        
        // Handle icon selection
        const selectedIcon = settings.selectedIcon || settings.appIcon;
        if (selectedIcon && iconGrid) {
            const iconOptions = iconGrid.querySelectorAll('.icon-option');
            iconOptions.forEach(option => {
                if (option.dataset.icon === selectedIcon) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            });
        }
    };

    // Load settings when window opens
    window.api.receive('load-settings', (settings) => {
        loadSettingsIntoUI(settings);
    });

    // Listen for settings window shown event
    if (window.electronAPI && window.electronAPI.receive) {
        window.electronAPI.receive('settings-window-shown', () => {
            requestCurrentSettings();
        });
    }

    // Save settings helper function
    const saveSettings = () => {
        const settings = {};
        if (azureKeyInput) settings.azureKey = azureKeyInput.value;
        if (azureRegionInput) settings.azureRegion = azureRegionInput.value;
        if (geminiKeyInput) settings.geminiKey = geminiKeyInput.value;
        if (windowGapInput) settings.windowGap = windowGapInput.value;
        if (codingLanguageSelect) settings.codingLanguage = codingLanguageSelect.value;
        if (activeSkillSelect) settings.activeSkill = activeSkillSelect.value;
        
        // Local LLM settings
        if (localLLMEndpointInput) settings.localLLMEndpoint = localLLMEndpointInput.value;
        if (localLLMModelInput) settings.localLLMModel = localLLMModelInput.value;
        
        // Browser LLM settings
        if (browserLLMPlatformSelect) settings.browserLLMPlatform = browserLLMPlatformSelect.value;
        if (browserLLMCustomUrlInput) settings.browserLLMCustomUrl = browserLLMCustomUrlInput.value;
        if (browserLLMHeadlessCheckbox) settings.browserLLMHeadless = browserLLMHeadlessCheckbox.checked;
        
        // Whisper settings
        if (whisperModelSelect) settings.whisperModel = whisperModelSelect.value;
        if (whisperLanguageSelect) settings.whisperLanguage = whisperLanguageSelect.value;
        if (whisperDeviceSelect) settings.whisperDevice = whisperDeviceSelect.value;
        
        window.api.send('save-settings', settings);
    };

    // Get DOM elements for new settings
    const localLLMEndpointInput = document.getElementById('localLLMEndpoint');
    const localLLMModelInput = document.getElementById('localLLMModel');
    const checkLocalLLMBtn = document.getElementById('checkLocalLLMBtn');
    const localLLMStatus = document.getElementById('localLLMStatus');
    
    const browserLLMPlatformSelect = document.getElementById('browserLLMPlatform');
    const browserLLMCustomUrlInput = document.getElementById('browserLLMCustomUrl');
    const customUrlItem = document.getElementById('customUrlItem');
    const browserLLMHeadlessCheckbox = document.getElementById('browserLLMHeadless');
    
    const whisperModelSelect = document.getElementById('whisperModel');
    const whisperLanguageSelect = document.getElementById('whisperLanguage');
    const whisperDeviceSelect = document.getElementById('whisperDevice');

    // Show/hide custom URL input based on platform selection
    if (browserLLMPlatformSelect) {
        browserLLMPlatformSelect.addEventListener('change', (e) => {
            if (customUrlItem) {
                customUrlItem.style.display = e.target.value === 'custom' ? 'flex' : 'none';
            }
            saveSettings();
        });
    }

    // Add event listeners for all inputs
    const inputs = [
        azureKeyInput,
        azureRegionInput,
        geminiKeyInput,
        windowGapInput,
        localLLMEndpointInput,
        localLLMModelInput,
        browserLLMCustomUrlInput
    ];

    inputs.forEach(input => {
        if (input) {
            input.addEventListener('change', saveSettings);
            input.addEventListener('blur', saveSettings);
        }
    });

    // Add listeners for select dropdowns
    const selects = [
        codingLanguageSelect,
        activeSkillSelect,
        whisperModelSelect,
        whisperLanguageSelect,
        whisperDeviceSelect
    ];

    selects.forEach(select => {
        if (select) {
            select.addEventListener('change', saveSettings);
        }
    });

    // Checkbox listener
    if (browserLLMHeadlessCheckbox) {
        browserLLMHeadlessCheckbox.addEventListener('change', saveSettings);
    }

    // Check Local LLM connection button
    if (checkLocalLLMBtn && localLLMStatus) {
        checkLocalLLMBtn.addEventListener('click', async () => {
            try {
                localLLMStatus.textContent = 'Checking...';
                localLLMStatus.style.color = 'rgba(255, 255, 255, 0.6)';
                
                const endpoint = localLLMEndpointInput?.value || 'http://localhost:1234/v1';
                const response = await fetch(`${endpoint}/models`);
                
                if (response.ok) {
                    localLLMStatus.textContent = '✅ Connected';
                    localLLMStatus.style.color = 'rgba(76, 175, 80, 1)';
                    
                    // Try to get model list
                    const data = await response.json();
                    if (data.data && data.data.length > 0) {
                        const modelName = data.data[0].id;
                        if (localLLMModelInput && !localLLMModelInput.value) {
                            localLLMModelInput.value = modelName;
                            localLLMModelInput.placeholder = modelName;
                        }
                    }
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                localLLMStatus.textContent = '❌ Not connected';
                localLLMStatus.style.color = 'rgba(244, 67, 54, 1)';
                console.error('Local LLM check failed:', error);
            }
        });
    }

    // Language selection handler
    if (codingLanguageSelect) {
        codingLanguageSelect.addEventListener('change', (e) => {
            saveSettings();
        });
    }

    // Skill selection handler
    if (activeSkillSelect) {
        activeSkillSelect.addEventListener('change', (e) => {
            saveSettings();
            // Also update the main window
            window.api.send('update-skill', e.target.value);
        });
    }

    // Initialize icon grid with correct paths
    const initializeIconGrid = () => {
        if (!iconGrid) return;

        const icons = [
            { key: 'terminal', name: 'Terminal', src: './assests/icons/terminal.png' },
            { key: 'activity', name: 'Activity', src: './assests/icons/activity.png' },
            { key: 'settings', name: 'Settings', src: './assests/icons/settings.png' }
        ];

        iconGrid.innerHTML = '';

        icons.forEach(icon => {
            const iconElement = document.createElement('div');
            iconElement.className = 'icon-option';
            iconElement.dataset.icon = icon.key;
            
            const img = document.createElement('img');
            img.src = icon.src;
            img.alt = icon.name;
            img.onload = () => {
                logger.info('Icon loaded successfully:', icon.src);
            };
            img.onerror = () => {
                console.error('Failed to load icon:', icon.src);
                // Try alternative paths
                const altPaths = [
                    `./assests/${icon.key}.png`,
                    `./assets/icons/${icon.key}.png`,
                    `./assets/${icon.key}.png`
                ];
                
                let pathIndex = 0;
                const tryNextPath = () => {
                    if (pathIndex < altPaths.length) {
                        img.src = altPaths[pathIndex];
                        pathIndex++;
                    } else {
                        img.style.display = 'none';
                        console.error('All icon paths failed for:', icon.key);
                    }
                };
                
                img.onload = () => {
                    logger.info('Icon loaded with alternative path:', img.src);
                };
                
                img.onerror = tryNextPath;
                tryNextPath();
            };
            
            const label = document.createElement('div');
            label.textContent = icon.name;
            
            iconElement.appendChild(img);
            iconElement.appendChild(label);
            
            // Click handler for icon selection
            iconElement.addEventListener('click', () => {                
                // Remove selection from all icons
                iconGrid.querySelectorAll('.icon-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Add selection to clicked icon
                iconElement.classList.add('selected');
                
                // Save the selection - this should trigger the app icon change
                window.api.send('save-settings', { selectedIcon: icon.key });
                
                // Show visual feedback
                iconElement.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    iconElement.style.transform = 'scale(1)';
                }, 100);
            });
            
            iconGrid.appendChild(iconElement);
        });
    };

    // Initialize icon grid
    initializeIconGrid();

    // Request settings on load
    setTimeout(() => {
        requestCurrentSettings();
    }, 200);

    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.api.send('close-settings');
        }
    });
}); 