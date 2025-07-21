// Family Feud Game - Multi-instance Support
function initializeFamilyFeud(container) {
    // Game state for this instance
    const gameState = {
        currentScore: 0,
        revealedAnswers: new Set(),
        guessedAnswers: new Set(),
        strikes: 0
    };

    // Audio functions
    const audio = {
        context: null,
        init() {
            try {
                this.context = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.log('Audio not supported');
            }
        },
        play(frequency, duration, type = 'sine') {
            if (!this.context) return;
            
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.context.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
            
            oscillator.start();
            oscillator.stop(this.context.currentTime + duration);
        },
        success() {
            [523, 659, 784].forEach((note, i) => 
                setTimeout(() => this.play(note, 0.2), i * 100)
            );
        },
        wrong() {
            [200, 150, 100].forEach((note, i) => 
                setTimeout(() => this.play(note, 0.1, 'sawtooth'), i * 100)
            );
        },
        complete() {
            [523, 659, 784, 1047].forEach((note, i) => 
                setTimeout(() => this.play(note, 0.3), i * 150)
            );
        }
    };

    // DOM elements for this instance
    const elements = {
        container: container,
        questionDisplay: container.querySelector('.question-display'),
        controlsRow: container.querySelector('.controls-row'),
        hintDisplay: container.querySelector('.hint-display'),
        playerInput: container.querySelector('.player-input'),
        redXOverlay: container.querySelector('.red-x-overlay'),
        answerSlots: container.querySelectorAll('.answer-slot'),
        input: null,
        strikeCount: null,
        strikeXs: null,
        scoreDisplay: null
    };

    // Answer matching function
    function isAnswerMatch(playerAnswer, correctAnswer) {
        const player = playerAnswer.toLowerCase().trim();
        const correct = correctAnswer.toLowerCase().trim();
        
        // Exact match only
        return player === correct;
    }

    // Utility functions
    function showRedX() {
        elements.redXOverlay.classList.add('show');
        setTimeout(() => elements.redXOverlay.classList.remove('show'), 800);
    }

    function updateScore() {
        elements.scoreDisplay.textContent = `Score: ${gameState.currentScore} / ${elements.answerSlots.length}`;
    }

    function updateStrikes() {
        elements.strikeCount.textContent = gameState.strikes;
        elements.strikeXs.innerHTML = '✗'.repeat(gameState.strikes);
    }

    function getUnguessedAnswers() {
        const unguessed = [];
        elements.answerSlots.forEach((slot, index) => {
            if (!gameState.guessedAnswers.has(index) && !gameState.revealedAnswers.has(index)) {
                unguessed.push(index);
            }
        });
        return unguessed;
    }

    function getUnrevealedAnswers() {
        const unrevealed = [];
        elements.answerSlots.forEach((slot, index) => {
            if (!gameState.revealedAnswers.has(index)) {
                unrevealed.push(index);
            }
        });
        return unrevealed;
    }

    function revealAnswer(index, isStrike = false) {
        const slot = elements.answerSlots[index];
        gameState.revealedAnswers.add(index);
        
        slot.classList.remove('hidden');
        slot.classList.add(isStrike ? 'revealed-strike' : 'revealed');
        
        if (!isStrike) {
            gameState.currentScore++;
            gameState.guessedAnswers.add(index);
            audio.success();
        }
        
        updateScore();
        
        if (gameState.revealedAnswers.size === elements.answerSlots.length) {
            setTimeout(() => {
                audio.complete();
                showGameComplete();
            }, 500);
        }
    }

    function revealNextAnswer() {
        const unrevealedIndexes = getUnrevealedAnswers();
        if (unrevealedIndexes.length > 0) {
            const nextIndex = unrevealedIndexes[0];
            revealAnswer(nextIndex, true);
        }
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter') {
            submitAnswer();
        }
    }

    function submitAnswer() {
        if (!audio.context) audio.init();
        
        const answer = elements.input.value.trim();
        if (!answer) return;
        
        let foundMatch = false;
        
        elements.answerSlots.forEach((slot, index) => {
            if (!gameState.revealedAnswers.has(index)) {
                const correctAnswer = slot.dataset.answer;
                if (isAnswerMatch(answer, correctAnswer)) {
                    foundMatch = true;
                    revealAnswer(index);
                }
            }
        });
        
        if (!foundMatch) {
            gameState.strikes++;
            
            elements.input.classList.add('wrong-answer');
            setTimeout(() => elements.input.classList.remove('wrong-answer'), 500);
            
            showRedX();
            audio.wrong();
            updateStrikes();
            
            if (gameState.strikes >= 3) {
                revealNextAnswer();
                gameState.strikes = 0;
                updateStrikes();
            }
        }
        
        elements.input.value = '';
        elements.input.focus();
    }

    function showHint() {
        const unguessedIndexes = getUnguessedAnswers();
        if (unguessedIndexes.length > 0) {
            const nextIndex = unguessedIndexes[0];
            const hint = elements.answerSlots[nextIndex].dataset.hint;
            elements.hintDisplay.textContent = `💡 ${hint}`;
            elements.hintDisplay.style.display = 'block';
            setTimeout(() => elements.hintDisplay.style.display = 'none', 4000);
        } else {
            elements.hintDisplay.textContent = "🎉 All answers guessed!";
            elements.hintDisplay.style.display = 'block';
            setTimeout(() => elements.hintDisplay.style.display = 'none', 2000);
        }
    }

    function showGameComplete() {
        const isWin = gameState.currentScore === elements.answerSlots.length;
        const gameOver = document.createElement('div');
        gameOver.className = 'game-over';
        gameOver.innerHTML = `
            <h3>🎉 SURVEY SAYS... 🎉</h3>
            <p><strong>${isWin ? 'PERFECT SCORE!' : 'GAME OVER'}</strong></p>
            <p>You found ${gameState.currentScore} out of ${elements.answerSlots.length} answers!</p>
            <p><strong>Result: ${isWin ? 'PASS ✅' : 'INCOMPLETE ❌'}</strong></p>
            <button class="btn-custom btn-hint" onclick="this.closest('.family-feud-container').familyFeudInstance.resetGame()">Play Again</button>
        `;
        elements.container.appendChild(gameOver);
    }

    function resetGame() {
        gameState.currentScore = 0;
        gameState.revealedAnswers.clear();
        gameState.guessedAnswers.clear();
        gameState.strikes = 0;
        
        elements.answerSlots.forEach(slot => {
            slot.classList.remove('revealed', 'revealed-strike');
            slot.classList.add('hidden');
        });
        
        updateScore();
        updateStrikes();
        elements.hintDisplay.style.display = 'none';
        
        const gameOver = elements.container.querySelector('.game-over');
        if (gameOver) gameOver.remove();
        
        elements.input.focus();
    }

    // Initialize this instance
    function init() {
        // Create unique IDs for this instance
        const instanceId = 'ff_' + Math.random().toString(36).substr(2, 9);
        
        // Create controls dynamically
        elements.controlsRow.innerHTML = `
            <div class="strikes-display">
                STRIKES: <span class="strike-count">0</span>/3
                <div class="strike-xs"></div>
            </div>
            <div class="score-display">
                Score: 0 / ${elements.answerSlots.length}
            </div>
        `;
        
        // Create player input dynamically
        elements.playerInput.innerHTML = `
            <div class="input-group">
                <input type="text" class="player-answer" placeholder="Type your answer here...">
                <div class="button-group">
                    <button class="btn-custom btn-submit">Submit</button>
                    <button class="btn-custom btn-hint">Hint</button>
                    <button class="btn-custom btn-reset">Reset</button>
                </div>
            </div>
        `;
        
        // Create red X overlay content
        elements.redXOverlay.innerHTML = '<div class="red-x">✗</div>';
        
        // Update element references
        elements.input = elements.container.querySelector('.player-answer');
        elements.strikeCount = elements.container.querySelector('.strike-count');
        elements.strikeXs = elements.container.querySelector('.strike-xs');
        elements.scoreDisplay = elements.container.querySelector('.score-display');
        
        // Add event listeners
        elements.input.addEventListener('keypress', handleKeyPress);
        elements.container.querySelector('.btn-submit').addEventListener('click', submitAnswer);
        elements.container.querySelector('.btn-hint').addEventListener('click', showHint);
        elements.container.querySelector('.btn-reset').addEventListener('click', resetGame);
        
        // Auto-generate answer numbers
        elements.answerSlots.forEach((slot, index) => {
            const numberDiv = document.createElement('div');
            numberDiv.className = 'answer-number';
            numberDiv.textContent = index + 1;
            slot.insertBefore(numberDiv, slot.firstChild);
        });
        
        updateScore();
        updateStrikes();
        elements.input.focus();
    }

    // Store instance reference on container for external access
    container.familyFeudInstance = {
        resetGame: resetGame,
        submitAnswer: submitAnswer,
        showHint: showHint
    };

    // Initialize
    init();
}

// Auto-initialize all Family Feud containers on page load
document.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('.family-feud-container');
    containers.forEach(container => {
        initializeFamilyFeud(container);
    });
});
