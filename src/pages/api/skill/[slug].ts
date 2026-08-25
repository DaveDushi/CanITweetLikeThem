import type { APIRoute } from 'astro';
import { getCreator } from '../../../lib/creators';
import { buildSkillMd } from '../../../lib/skill';

export const GET: APIRoute = async ({ params }) => {
  const creator = getCreator(params.slug ?? '');
  if (!creator) return new Response('not found', { status: 404 });

  const md = buildSkillMd(creator);
  return new Response(md, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="${creator.slug}-posts-skill.md"`,
    },
  });
};
