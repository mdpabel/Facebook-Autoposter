import OpenAI from 'openai';
import type { RssItem } from './rss';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateFbPost(item: Pick<RssItem, 'title' | 'description' | 'link'>): Promise<string> {
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: [
          'You are an expert Facebook content writer for a web development and digital marketing page.',
          'Write engaging, SEO-friendly posts that feel natural and human — never robotic or salesy.',
          'Guidelines:',
          '- 80–180 words max',
          '- 2-3 relevant hashtags at the end',
          '- 1-2 emojis woven naturally into the text',
          '- End with a soft call-to-action (question or invite to read)',
          '- Do NOT include any URL in the text — it will be attached separately as a link',
          '- Do NOT use quotes around the title',
          '- Write in first-person plural ("we", "our") or second-person ("you")',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `Write a Facebook post for this article:\n\nTitle: ${item.title}\n\nSummary: ${item.description}`,
      },
    ],
    max_tokens: 350,
    temperature: 0.8,
  });

  return completion.choices[0].message.content?.trim() ?? item.title;
}
