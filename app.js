// ========= 1. Inizializzazione di Supabase =========
const SUPABASE_URL = 'https://djikypgmchywybjxbwar.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqaWt5cGdtY2h5d3lianhid2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTMyOTIsImV4cCI6MjA2ODc4OTI5Mn0.dXqWkg47xTg2YtfLhBLrFd5AIB838KdsmR9qsMPkk8Q';

// Usa l'oggetto 'supabase' globale (caricato dall'HTML) per creare il tuo client.
// Lo nominiamo 'supabaseClient' per evitare conflitti.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ========= 2. Esegui il resto del codice solo quando la pagina è pronta =========
document.addEventListener('DOMContentLoaded', () => {

    // --- Variabile di stato globale per le poesie ---
    let allPoems = [];
    let dataLoaded = false;

    // --- SELEZIONE DI TUTTI GLI ELEMENTI HTML ---
    const poemsListContainer = document.querySelector('.poems-list');
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const userEmailSpan = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    const googleLoginBtn = document.getElementById('login-google-btn');
    const submissionModal = document.getElementById('submission-modal');
    const openSubmissionModalBtn = document.getElementById('open-submission-modal-btn');
    const closeSubmissionModalBtn = document.getElementById('close-submission-modal-btn');
    const submissionForm = document.getElementById('submission-form');
    const anonymousCheckbox = document.getElementById('anonymous-checkbox');
    const firstNameInput = document.getElementById('author-firstname');
    const lastNameInput = document.getElementById('author-lastname');
    const instagramInput = document.getElementById('author-instagram');
    const formMessage = document.getElementById('form-message');
    const votingModal = document.getElementById('voting-modal');
    const closeVotingModalBtn = document.getElementById('close-voting-modal-btn');
    const starRatingContainer = document.querySelector('#voting-modal .star-rating');
    const submitVoteBtn = document.getElementById('submit-vote-btn');
    const votePoemIdInput = document.getElementById('vote-poem-id');
    const voteMessage = document.getElementById('vote-form-message');
    const howToModal = document.getElementById('how-to-modal');
    const aboutUsModal = document.getElementById('about-us-modal');
    const howToLink = document.getElementById('how-to-link');
    const aboutUsLink = document.getElementById('about-us-link');
    const closeHowToModalBtn = document.getElementById('close-how-to-modal-btn');
    const closeAboutUsModalBtn = document.getElementById('close-about-us-modal-btn');
    const howToSubmitBtn = document.getElementById('how-to-submit-btn');
    const sidebarParticipateBtn = document.getElementById('sidebar-participate-btn');
    const searchInput = document.getElementById('search-poems');
    const sortBySelect = document.getElementById('sort-by');
    const monthlyPoemsListContainer = document.getElementById('monthly-poems-list');

    // =======================================================
    // GESTIONE AUTENTICAZIONE E CARICAMENTO INIZIALE
    // =======================================================
    async function signInWith(provider) { await supabaseClient.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } }); }
    async function signOut() { await supabaseClient.auth.signOut(); }

    if (googleLoginBtn) googleLoginBtn.addEventListener('click', () => signInWith('google'));
    if (logoutBtn) logoutBtn.addEventListener('click', signOut);

    supabaseClient.auth.onAuthStateChange((event, session) => {
        const loggedIn = !!session;
        authButtons.classList.toggle('hidden', loggedIn);
        userInfo.classList.toggle('hidden', !loggedIn);
        if (loggedIn) {
            userEmailSpan.textContent = session.user.email;
            openSubmissionModalBtn.disabled = false;
            if (!dataLoaded) {
                caricaDatiIniziali();
                dataLoaded = true;
            }
        } else {
            userEmailSpan.textContent = '';
            openSubmissionModalBtn.disabled = true;
            dataLoaded = false;
            allPoems = [];
            renderPoems();
        }
    });

    // =======================================================
    // GESTIONE MODALI
    // =======================================================
    const setupModal = (modal, openTriggers, closeTriggers) => {
        if (!modal) return;
        openTriggers.forEach(trigger => {
            if (trigger) trigger.addEventListener('click', (e) => { e.preventDefault(); modal.classList.remove('hidden'); });
        });
        closeTriggers.forEach(trigger => {
            if (trigger) trigger.addEventListener('click', () => modal.classList.add('hidden'));
        });
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    };

    setupModal(submissionModal, [openSubmissionModalBtn], [closeSubmissionModalBtn]);
    setupModal(votingModal, [], [closeVotingModalBtn]);
    setupModal(howToModal, [howToLink, sidebarParticipateBtn], [closeHowToModalBtn]);
    setupModal(aboutUsModal, [aboutUsLink], [closeAboutUsModalBtn]);

    if (howToSubmitBtn) {
        howToSubmitBtn.addEventListener('click', async () => {
            howToModal.classList.add('hidden');
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                submissionModal.classList.remove('hidden');
            } else {
                alert("Per favore, accedi con Google prima di inviare una poesia.");
            }
        });
    }

    // =======================================================
    // LOGICA FORM INVIO POESIA
    // =======================================================
    if (anonymousCheckbox) {
        anonymousCheckbox.addEventListener('change', () => {
            const isChecked = anonymousCheckbox.checked;
            [firstNameInput, lastNameInput, instagramInput].forEach(input => input.disabled = isChecked);
            if (isChecked) [firstNameInput, lastNameInput, instagramInput].forEach(input => input.value = '');
        });
    }

    if (submissionForm) {
        submissionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) { alert("Devi effettuare l'accesso per poter inviare una poesia!"); return; }

            const user = session.user;
            const title = document.getElementById('poem-title').value;
            const content = document.getElementById('poem-content').value;
            const isAnonymous = anonymousCheckbox.checked;
            const author_name = isAnonymous ? 'Anonimo' : `${firstNameInput.value.trim()} ${lastNameInput.value.trim()}`.trim();
            const instagram_handle = instagramInput.value.trim();

            if (!title || !content || (!isAnonymous && !author_name)) {
                formMessage.textContent = 'Per favore, compila tutti i campi richiesti.';
                formMessage.style.color = 'red';
                return;
            }

            formMessage.textContent = 'Invio in corso...';
            const { error: insertError } = await supabaseClient.from('poesie').insert([{ title, content, author_name, profile_id: user.id }]);

            if (insertError) {
                formMessage.textContent = `Errore: ${insertError.message}`;
                formMessage.style.color = 'red';
                return;
            }

            if (!isAnonymous) {
                await supabaseClient.from('profiles').update({ username: author_name, instagram_handle }).eq('id', user.id);
            }

            formMessage.textContent = 'Grazie! La tua poesia è stata inviata con successo!';
            formMessage.style.color = 'green';
            submissionForm.reset();
            
            await caricaDatiIniziali();
            setTimeout(() => {
                submissionModal.classList.add('hidden');
                formMessage.textContent = '';
            }, 3000);
        });
    }
    
    // =======================================================
    // LOGICA VOTAZIONE
    // =======================================================
    let currentRating = 0;

    async function apriModaleVoto(poemId) {
        if (!poemId) return;
        if (document.cookie.includes(`voted-poem-${poemId}=true`)) {
            alert("Hai già votato questa poesia. Grazie!");
            return;
        }
        const { data: poem } = await supabaseClient.from('poesie').select('*').eq('id', poemId).single();
        if (poem) {
            document.getElementById('vote-poem-title').textContent = poem.title;
            document.getElementById('vote-poem-author').textContent = `di ${poem.author_name}`;
            document.getElementById('vote-poem-content').textContent = poem.content;
            votePoemIdInput.value = poemId;
            resetStars();
            votingModal.classList.remove('hidden');
        }
    }

    if (poemsListContainer) {
        poemsListContainer.addEventListener('click', (event) => {
            const poemRow = event.target.closest('.poem-row');
            if (poemRow) {
                if (event.target.closest('.button-vote')) {
                    const poemId = event.target.closest('.button-vote').dataset.poemId;
                    apriModaleVoto(poemId);
                }
            }
        });
    }

    if (monthlyPoemsListContainer) {
        monthlyPoemsListContainer.addEventListener('click', (event) => {
            const miniPoemItem = event.target.closest('.mini-poem-item');
            if (miniPoemItem) {
                const poemId = miniPoemItem.dataset.poemId;
                apriModaleVoto(poemId);
            }
        });
    }
    
    function resetStars() {
        currentRating = 0;
        starRatingContainer.querySelectorAll('label.star i').forEach(icon => {
            icon.classList.remove('selected', 'fa-solid');
            icon.classList.add('fa-regular');
        });
        const checkedRadio = starRatingContainer.querySelector('input[type="radio"]:checked');
        if (checkedRadio) checkedRadio.checked = false;
    }

    function highlightStars(rating) {
        starRatingContainer.querySelectorAll('label.star').forEach(starLabel => {
            const starIcon = starLabel.querySelector('i');
            if (starLabel.dataset.value <= rating) {
                starIcon.classList.add('selected', 'fa-solid');
                starIcon.classList.remove('fa-regular');
            } else {
                starIcon.classList.remove('selected', 'fa-solid');
                starIcon.classList.add('fa-regular');
            }
        });
    }

    if (starRatingContainer) {
        starRatingContainer.addEventListener('click', (event) => {
            const starLabel = event.target.closest('.star');
            if (starLabel) {
                currentRating = starLabel.dataset.value;
                highlightStars(currentRating);
            }
        });
    }

    if (submitVoteBtn) {
        submitVoteBtn.addEventListener('click', async () => {
            if (currentRating === 0) {
                voteMessage.textContent = 'Per favore, seleziona da 1 a 5 stelle.';
                voteMessage.style.color = 'red';
                return;
            }

            const poemId = votePoemIdInput.value;
            const rating = currentRating;
            
            voteMessage.textContent = 'Invio in corso...';

            const { error } = await supabaseClient.functions.invoke('invia-voto', {
                body: { 
                    "id_poesia": poemId,
                    "rating": rating
                }
            });

            if (error) {
                console.error("Dettaglio errore da Supabase:", error);
                voteMessage.textContent = 'Si è verificato un errore. Potresti aver già votato.';
                voteMessage.style.color = 'red';
                return;
            }

            voteMessage.textContent = 'Grazie per aver votato!';
            voteMessage.style.color = 'green';
            
            document.cookie = `voted-poem-${poemId}=true; max-age=31536000; path=/`;

            await caricaDatiIniziali(); 
            setTimeout(() => {
                votingModal.classList.add('hidden');
                voteMessage.textContent = '';
            }, 2000);
        });
    }

    // =======================================================
    // FUNZIONE DI RENDER E CARICAMENTO POESIE
    // =======================================================
    function renderPoems() {
        const searchTerm = searchInput.value.toLowerCase();
        let filteredPoems = allPoems.filter(poesia => 
            poesia.title.toLowerCase().includes(searchTerm) || 
            poesia.author_name.toLowerCase().includes(searchTerm)
        );

        const now = new Date();
        const currentMonthUTC = now.getUTCMonth();
        const currentYearUTC = now.getUTCFullYear();
        let monthlyPoems = filteredPoems.filter(poesia => {
            const poemDate = new Date(poesia.created_at);
            return poemDate.getUTCMonth() === currentMonthUTC && poemDate.getUTCFullYear() === currentYearUTC;
        });

        const sortBy = sortBySelect.value;
        monthlyPoems.sort((a, b) => {
            switch (sortBy) {
                case 'popular': return (b.vote_count || 0) - (a.vote_count || 0);
                case 'title-asc': return a.title.localeCompare(b.title);
                case 'title-desc': return b.title.localeCompare(a.title);
                default: return new Date(b.created_at) - new Date(a.created_at);
            }
        });
        
        const topTenPoems = [...filteredPoems].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)).slice(0, 10);
        
        if (poemsListContainer) {
            if (topTenPoems.length === 0) {
                poemsListContainer.innerHTML = searchTerm ? '<p>Nessuna poesia trovata per la tua ricerca.</p>' : '<p>Non ci sono ancora poesie. Sii il primo a partecipare!</p>';
            } else {
                 poemsListContainer.innerHTML = topTenPoems.map(poesia => {
                    const profile = Array.isArray(poesia.profiles) ? poesia.profiles[0] : poesia.profiles;
                    const instagramIcon = profile && profile.instagram_handle ? `<a href="https://www.instagram.com/${profile.instagram_handle}" target="_blank" class="social-icon" aria-label="Instagram"><i class="fab fa-instagram"></i></a>` : '';
                    return `
                        <article class="poem-row" data-poem-id="${poesia.id}">
                            <div class="poem-info">
                                <span class="poem-title">${poesia.title}</span>
                                <span class="poem-author">di ${poesia.author_name}</span>
                            </div>
                            <div class="poem-actions">
                                ${instagramIcon}
                                <span class="poem-votes">${poesia.vote_count || 0} Voti</span>
                                <button class="button-vote" data-poem-id="${poesia.id}">Vota</button>
                            </div>
                        </article>`;
                }).join('');
            }
        }
        
        if (monthlyPoemsListContainer) {
            if (monthlyPoems.length === 0) {
                monthlyPoemsListContainer.innerHTML = '<p style="font-size: 0.9rem; color: #777;">Nessuna poesia per questo mese.</p>';
            } else {
                monthlyPoemsListContainer.innerHTML = monthlyPoems.map(poesia => {
                    const poemDate = new Date(poesia.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
                    return `
                        <div class="mini-poem-item" data-poem-id="${poesia.id}">
                            <span class="mini-poem-title">${poesia.title}</span>
                            <span class="mini-poem-author">di ${poesia.author_name}</span>
                            <span class="mini-poem-date">${poemDate}</span>
                        </div>`;
                }).join('');
            }
        }
    }

    async function caricaDatiIniziali() {
        if (poemsListContainer) poemsListContainer.innerHTML = '<p>Caricamento...</p>';
        if (monthlyPoemsListContainer) monthlyPoemsListContainer.innerHTML = '<p>Caricamento...</p>';
        
        const { data, error } = await supabaseClient.rpc('get_poems_with_votes');
        if (error) {
            console.error('Errore RPC:', error);
            if (poemsListContainer) poemsListContainer.innerHTML = '<p>Errore nel caricamento.</p>';
            if (monthlyPoemsListContainer) monthlyPoemsListContainer.innerHTML = '<p>Errore nel caricamento.</p>';
            return;
        }
        allPoems = data;
        renderPoems();
    }
    
    if(searchInput) searchInput.addEventListener('input', renderPoems);
    if(sortBySelect) sortBySelect.addEventListener('change', renderPoems);
});
