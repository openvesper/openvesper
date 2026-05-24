// ============================================================
// 🌒 @openvesper/plugin-books
// Books — Google Books (FREE) + OpenLibrary (FREE)
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

// ── Google Books (FREE, no auth) ───────────────────────────

async function searchBooks(query: string, limit?: number): Promise<ToolResult> {
  try {
    const max = Math.min(limit || 10, 40);
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${max}`);
    if (!r.ok) return { success: false, error: `Google Books: ${r.status}` };
    const data = await r.json();
    const items = (data.items || []) as any[];

    return {
      success: true,
      data: {
        total: data.totalItems,
        books: items.map((b) => ({
          id: b.id,
          title: b.volumeInfo?.title,
          authors: b.volumeInfo?.authors,
          publisher: b.volumeInfo?.publisher,
          published: b.volumeInfo?.publishedDate,
          page_count: b.volumeInfo?.pageCount,
          categories: b.volumeInfo?.categories,
          rating: b.volumeInfo?.averageRating,
          ratings_count: b.volumeInfo?.ratingsCount,
          isbn_13: b.volumeInfo?.industryIdentifiers?.find((id: any) => id.type === "ISBN_13")?.identifier,
          isbn_10: b.volumeInfo?.industryIdentifiers?.find((id: any) => id.type === "ISBN_10")?.identifier,
          thumbnail: b.volumeInfo?.imageLinks?.thumbnail,
          preview: b.volumeInfo?.previewLink,
          description: b.volumeInfo?.description?.slice(0, 300),
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function bookDetails(volumeId: string): Promise<ToolResult> {
  try {
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes/${volumeId}`);
    if (!r.ok) return { success: false, error: `Google Books: ${r.status}` };
    const data = await r.json();
    return {
      success: true,
      data: {
        title: data.volumeInfo?.title,
        subtitle: data.volumeInfo?.subtitle,
        authors: data.volumeInfo?.authors,
        publisher: data.volumeInfo?.publisher,
        published: data.volumeInfo?.publishedDate,
        description: data.volumeInfo?.description,
        page_count: data.volumeInfo?.pageCount,
        categories: data.volumeInfo?.categories,
        language: data.volumeInfo?.language,
        maturity_rating: data.volumeInfo?.maturityRating,
        rating: data.volumeInfo?.averageRating,
        ratings_count: data.volumeInfo?.ratingsCount,
        thumbnail: data.volumeInfo?.imageLinks?.thumbnail,
        preview_link: data.volumeInfo?.previewLink,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function searchByAuthor(author: string, limit?: number): Promise<ToolResult> {
  return searchBooks(`inauthor:"${author}"`, limit);
}

async function searchByIsbn(isbn: string): Promise<ToolResult> {
  return searchBooks(`isbn:${isbn}`, 1);
}

// ── OpenLibrary (FREE, no auth) ────────────────────────────

async function openLibrarySearch(query: string): Promise<ToolResult> {
  try {
    const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`);
    if (!r.ok) return { success: false, error: `OpenLibrary: ${r.status}` };
    const data = await r.json();
    const docs = (data.docs || []) as any[];

    return {
      success: true,
      data: {
        total: data.numFound,
        books: docs.slice(0, 10).map((b) => ({
          key: b.key,
          title: b.title,
          authors: b.author_name,
          first_published: b.first_publish_year,
          editions_count: b.edition_count,
          isbn: (b.isbn || []).slice(0, 3),
          subjects: (b.subject || []).slice(0, 5),
          openlibrary_url: `https://openlibrary.org${b.key}`,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function authorBooks(authorName: string): Promise<ToolResult> {
  try {
    // First find the author
    const authorRes = await fetch(`https://openlibrary.org/search/authors.json?q=${encodeURIComponent(authorName)}`);
    if (!authorRes.ok) return { success: false, error: `OpenLibrary: ${authorRes.status}` };
    const authorData = await authorRes.json();
    const author = authorData.docs?.[0];
    if (!author) return { success: false, error: `Author "${authorName}" not found` };

    // Then get their works
    const worksRes = await fetch(`https://openlibrary.org/authors/${author.key}/works.json?limit=50`);
    const worksData = await worksRes.json();

    return {
      success: true,
      data: {
        author: {
          name: author.name,
          birth: author.birth_date,
          death: author.death_date,
          top_work: author.top_work,
          works_count: author.work_count,
        },
        works: (worksData.entries || []).slice(0, 30).map((w: any) => ({
          title: w.title,
          first_publish_date: w.first_publish_date,
          key: w.key,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function bookRecommendations(seedTitle: string): Promise<ToolResult> {
  try {
    // Find the seed book
    const seedRes = await searchBooks(seedTitle, 1);
    if (!seedRes.success || !(seedRes.data as any).books?.length) {
      return { success: false, error: `Couldn't find seed book "${seedTitle}"` };
    }
    const seed = (seedRes.data as any).books[0];

    // Find related: same categories + same author
    const recs: any[] = [];
    if (seed.categories?.[0]) {
      const r = await searchBooks(`subject:"${seed.categories[0]}"`, 8);
      if (r.success) recs.push(...((r.data as any).books || []).filter((b: any) => b.title !== seed.title).slice(0, 5));
    }
    if (seed.authors?.[0]) {
      const r = await searchByAuthor(seed.authors[0], 5);
      if (r.success) recs.push(...((r.data as any).books || []).filter((b: any) => b.title !== seed.title).slice(0, 3));
    }

    // Dedupe by title
    const seen = new Set<string>();
    const unique = recs.filter((b) => {
      if (seen.has(b.title)) return false;
      seen.add(b.title);
      return true;
    });

    return {
      success: true,
      data: {
        seed: { title: seed.title, authors: seed.authors },
        recommendations: unique.slice(0, 10),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-books",
  version: "3.3.0",
  author: "OpenVesper",
  description: "Books — Search, recommendations, author works (Google Books + OpenLibrary, both FREE)",
  license: "MIT",
  tools: [
    defineTool({ name: "search_books", description: "Search books by title/keyword (Google Books)", inputSchema: inputSchema({ query: { type: "string" }, limit: { type: "number" } }, ["query"]), handler: async (i) => searchBooks(i.query as string, i.limit as number), category: "books" }),
    defineTool({ name: "book_details", description: "Get full details about a specific book by Google Books volume ID", inputSchema: inputSchema({ volume_id: { type: "string" } }, ["volume_id"]), handler: async (i) => bookDetails(i.volume_id as string), category: "books" }),
    defineTool({ name: "books_by_author", description: "Find books by a specific author (Google Books)", inputSchema: inputSchema({ author: { type: "string" }, limit: { type: "number" } }, ["author"]), handler: async (i) => searchByAuthor(i.author as string, i.limit as number), category: "books" }),
    defineTool({ name: "book_by_isbn", description: "Get book by ISBN", inputSchema: inputSchema({ isbn: { type: "string" } }, ["isbn"]), handler: async (i) => searchByIsbn(i.isbn as string), category: "books" }),
    defineTool({ name: "openlibrary_search", description: "Search books on OpenLibrary (alternative source)", inputSchema: inputSchema({ query: { type: "string" } }, ["query"]), handler: async (i) => openLibrarySearch(i.query as string), category: "books" }),
    defineTool({ name: "author_works", description: "Get full bibliography of an author (OpenLibrary)", inputSchema: inputSchema({ author: { type: "string" } }, ["author"]), handler: async (i) => authorBooks(i.author as string), category: "books" }),
    defineTool({ name: "book_recommendations", description: "Get book recommendations similar to a given title", inputSchema: inputSchema({ title: { type: "string", description: "Seed book title" } }, ["title"]), handler: async (i) => bookRecommendations(i.title as string), category: "books" }),
  ],
});
