import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Definisce le intestazioni per la gestione del CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Gestisce la richiesta preflight 'OPTIONS' inviata dal browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Estrae i dati dal corpo della richiesta
    const { poemId, rating } = await req.json();

    // Crea un client Supabase che agisce per conto dell'utente autenticato
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Recupera i dati dell'utente dal token di autenticazione
    const { data: { user } } = await supabaseClient.auth.getUser();

    // Se l'utente non è valido, restituisce un errore di autorizzazione
    if (!user) {
      return new Response(JSON.stringify({ error: 'Utente non autorizzato.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Inserisce il nuovo voto nella tabella 'voti'
    const { error } = await supabaseClient.from('voti').insert({
      poesia_id: poemId,
      rating: rating,
      user_id: user.id,
    });

    // Se il database restituisce un errore, lo lancia al blocco catch sottostante
    if (error) {
      throw error;
    }

    // Se tutto va a buon fine, restituisce una risposta di successo
    return new Response(JSON.stringify({ message: 'Voto ricevuto con successo!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Registra l'errore completo nei log della funzione per il debug
    console.error('Errore nella funzione:', error);

    // Gestisce l'errore specifico di "voto duplicato" (unique_violation)
    if (error.code === '23505') {
      return new Response(JSON.stringify({ error: 'Hai già votato questa poesia.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      });
    }

    // Gestisce tutti gli altri tipi di errori con un messaggio generico
    return new Response(JSON.stringify({ error: 'Errore interno del server.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
