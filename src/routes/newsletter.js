const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  if (!process.env.MAILERLITE_API_KEY) {
    return res.status(500).json({ error: 'Newsletter not configured' });
  }

  const groupId = process.env.MAILERLITE_GROUP_ID || '196687939781002436';

  try {
    const response = await fetch(
      `https://connect.mailerlite.com/api/groups/${groupId}/subscribers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
        },
        body: JSON.stringify({ email }),
      }
    );

    if (response.status === 422) {
      // Already subscribed — treat as success so the user isn't confused
      return res.json({ ok: true });
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(400).json({ error: err.message || 'Subscription failed' });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
