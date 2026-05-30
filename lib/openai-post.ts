import OpenAI from 'openai';
import type { RssItem } from './rss';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateFbPostFromImage(params: {
  imageUrl: string;
  headings: string[];
  title: string;
  link: string;
}): Promise<string> {
  const headingsContext = params.headings.length > 0
    ? `\n\nKey topics from the article:\n${params.headings.map((h) => `- ${h}`).join('\n')}`
    : '';

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: [
          'You are an expert Facebook content writer for a web development and digital marketing page.',
          'Write engaging posts inspired by the provided image and article context.',
          'Guidelines:',
          '- 80–180 words max',
          '- 2-3 relevant hashtags at the end',
          '- 1-2 emojis woven naturally into the text',
          '- End with a soft call-to-action (question or invite to read)',
          '- Do NOT include any URL in the text — the link will be appended separately',
          '- Write in first-person plural ("we", "our") or second-person ("you")',
          '- Base the post on what you observe in the image plus the article context provided',
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
            text: `Article: ${params.title}${headingsContext}\n\nWrite a Facebook post inspired by this image and the article.`,
          },
        ],
      },
    ],
    max_tokens: 400,
    temperature: 0.85,
  });

  const text = completion.choices[0].message.content?.trim() ?? params.title;
  return `${text}\n\n${params.link}`;
}

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
