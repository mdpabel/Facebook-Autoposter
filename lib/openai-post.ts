import OpenAI from 'openai';
import type { RssItem } from './rss';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateFbPostFromImage(params: {
  imageUrl: string;
  headings: string[];
  title: string;
  alt?: string;
}): Promise<string> {
  const headingsContext = params.headings.length > 0
    ? `\n\nKey topics from the article:\n${params.headings.map((h) => `- ${h}`).join('\n')}`
    : '';
  const altContext = params.alt ? `\n\nImage caption/alt text: ${params.alt}` : '';

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: [
          'You are a Facebook content writer for a web development and digital marketing page.',
          'Write a post inspired by the provided image and article context.',
          'Style rules:',
          '- Sound like a real person — friendly, natural, conversational',
          '- Use simple, basic English with short, clear sentences',
          '- 60–150 words',
          '- Use at most ONE emoji, only if it truly fits (none is fine — do not force it)',
          '- Add 2-3 relevant hashtags at the end',
          '- End with a soft call-to-action (a question or an invite to read)',
          '- Write SEO-friendly, optimized content that still reads naturally',
          '- Do NOT include any URL in the text — the link is added separately',
          '- Write in first-person plural ("we", "our") or second-person ("you")',
          '- Base the post on what you see in the image plus the article context',
        ].join('\n'),
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: params.imageUrl, detail: 'low' },
          },
          {
            type: 'text',
            text: `Article: ${params.title}${headingsContext}${altContext}\n\nWrite a Facebook post inspired by this image and the article.`,
          },
        ],
      },
    ],
    max_tokens: 400,
    temperature: 0.85,
  });

  return completion.choices[0].message.content?.trim() ?? params.title;
}

export async function generateFbPost(item: Pick<RssItem, 'title' | 'description' | 'link'>): Promise<string> {
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: [
          'You are a Facebook content writer for a web development and digital marketing page.',
          'Write a post that feels natural and human — never robotic or salesy.',
          'Style rules:',
          '- Sound like a real person — friendly, natural, conversational',
          '- Use simple, basic English with short, clear sentences',
          '- 60–150 words',
          '- Use at most ONE emoji, only if it truly fits (none is fine — do not force it)',
          '- Add 2-3 relevant hashtags at the end',
          '- End with a soft call-to-action (a question or an invite to read)',
          '- Write SEO-friendly, optimized content that still reads naturally',
          '- Do NOT include any URL in the text — it is added separately as a link',
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
