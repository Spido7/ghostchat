export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    const url = new URL(request.url);

    // --- 1. RANDOM 1:1 MATCHMAKING ---
    // Inside src/index.js
    if (url.pathname === '/match') {
      const myId = url.searchParams.get('id');
      const waitingId = await env.CHAT_QUEUE.get('waiting_user');
      
      // FIX: Ensure we don't match with ourselves
      if (waitingId && waitingId !== myId) {
        // MATCH FOUND!
        await env.CHAT_QUEUE.delete('waiting_user'); // Clear the seat
        return new Response(JSON.stringify({ status: 'matched', peerId: waitingId }), { headers: corsHeaders });
      } else {
        // NO MATCH, SIT IN THE CHAIR
        // Only update TTL if it's us, or take the seat if empty
        await env.CHAT_QUEUE.put('waiting_user', myId, { expirationTtl: 60 });
        return new Response(JSON.stringify({ status: 'waiting' }), { headers: corsHeaders });
      }
    }

    // --- 2. PUBLIC LOUNGE (Max 15) ---
    if (url.pathname === '/join-public') {
      const id = url.searchParams.get('id');
      const loungeKey = "GLOBAL_LOUNGE";
      
      let members = await env.CHAT_QUEUE.get(loungeKey, { type: "json" }) || [];
      members = members.filter(m => m !== id); // Remove self if exists

      if (members.length >= 15) {
        return new Response(JSON.stringify({ error: "Lounge is Full (Max 15)" }), { headers: corsHeaders });
      }

      members.push(id);
      await env.CHAT_QUEUE.put(loungeKey, JSON.stringify(members), { expirationTtl: 3600 }); 

      return new Response(JSON.stringify({ peers: members }), { headers: corsHeaders });
    }

    // --- 3. PRIVATE GROUP (Max 8) ---
    if (url.pathname === '/join-group') {
      const key = url.searchParams.get('key');
      const id = url.searchParams.get('id');

      if (!key || key.length !== 6) return new Response(JSON.stringify({ error: "Invalid Key" }), { headers: corsHeaders });

      let members = await env.CHAT_QUEUE.get(`group_${key}`, { type: "json" }) || [];
      members = members.filter(m => m !== id);

      if (members.length >= 7) { 
        return new Response(JSON.stringify({ error: "Group Full (Max 8)" }), { headers: corsHeaders });
      }

      members.push(id);
      await env.CHAT_QUEUE.put(`group_${key}`, JSON.stringify(members), { expirationTtl: 7200 });

      return new Response(JSON.stringify({ peers: members }), { headers: corsHeaders });
    }

    // --- 4. OXAPAY DONATION ---
    if (url.pathname === '/create-donation') {
      const amount = url.searchParams.get('amount') || "1";
      const orderId = crypto.randomUUID();

      const payload = {
        merchant: env.OXA_API_KEY, 
        amount: amount,
        currency: "USD",
        lifeTime: 30,
        feePaidByPayer: 0,
        returnUrl: `https://${url.hostname}/?status=thanks`,
        description: `GhostChat Donation ($${amount})`,
        orderId: orderId
      };
      
      try {
        const oxaRes = await fetch("https://api.oxapay.com/merchants/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await oxaRes.json();
        return new Response(JSON.stringify(data), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Oxapay Failed" }), { headers: corsHeaders });
      }
    }

    return new Response("GhostChat Signaling Active", { headers: corsHeaders });
  }
};