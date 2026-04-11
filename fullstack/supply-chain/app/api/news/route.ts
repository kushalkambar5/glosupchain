import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/index'
import { news } from '@/db/schema'
import { sql, gt, and } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
    }

    // Filter to valid numbers only
    const validIds = ids.filter((id: any) => typeof id === 'number' && !isNaN(id))

    if (validIds.length === 0) {
      return NextResponse.json({ news: [] })
    }

    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const twoDaysAgoISO = twoDaysAgo.toISOString()

    const results = await db
      .select({
        id: news.id,
        title: news.title,
        description: news.description,
        link: news.link,
        imageUrl: news.imageUrl,
        country: news.country,
        category: news.category,
        sourceUrl: news.sourceUrl,
        sourceName: news.sourceName,
        sourceIcon: news.sourceIcon,
        pubDate: news.pubDate,
      })
      .from(news)
      .where(
        and(
          sql`${news.id} IN (${sql.join(validIds.map((id: number) => sql`${id}`), sql`, `)})`,
          gt(news.createdAt, twoDaysAgoISO)
        )
      )

    // Convert bigint ids to numbers for JSON serialization
    const serializable = results.map(r => ({
      ...r,
      id: Number(r.id),
    }))

    return NextResponse.json({ news: serializable })
  } catch (error) {
    console.error('Error fetching news:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    )
  }
}
