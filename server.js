const express = require('express');
const path = require('path');
const posts = require('./data/posts');

const app = express();
const PORT = process.env.PORT || 3000;

// EJS template engine set karo
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files serve karo (CSS, images)
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────
// ROUTE 1: Home Page — sab posts dikhao
// ─────────────────────────────────────────
app.get('/', (req, res) => {
  const { category, search } = req.query;
  
  let filteredPosts = posts;
  
  // Category filter
  if (category && category !== 'All') {
    filteredPosts = posts.filter(p => p.category === category);
  }
  
  // Search filter
  if (search) {
    const q = search.toLowerCase();
    filteredPosts = filteredPosts.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }
  
  const featured = posts.find(p => p.featured);
  const categories = ['All', ...new Set(posts.map(p => p.category))];
  
  res.render('index', {
    posts: filteredPosts,
    featured,
    categories,
    currentCategory: category || 'All',
    searchQuery: search || '',
    totalArticles: posts.length,
    totalAuthors: [...new Set(posts.map(p => p.author))].length,
    totalCategories: [...new Set(posts.map(p => p.category))].length
  });
});

// ─────────────────────────────────────────
// ROUTE 2: Single Post Page
// ─────────────────────────────────────────
app.get('/post/:id', (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  
  if (!post) {
    return res.status(404).render('404', { message: 'Post not found' });
  }
  
  // Related posts (same category, exclude current)
  const related = posts
    .filter(p => p.category === post.category && p.id !== post.id)
    .slice(0, 3);
  
  res.render('post', { post, related });
});

// ─────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).send(`
    <div style="text-align:center;padding:4rem;font-family:sans-serif;background:#0d0d0d;color:#fff;min-height:100vh">
      <h1 style="font-size:4rem;color:#e85d24">404</h1>
      <p style="font-size:1.2rem;color:#aaa">Page not found</p>
      <a href="/" style="color:#e85d24;text-decoration:none;font-size:1rem">← Back to Home</a>
    </div>
  `);
});

// Server start karo
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ AhmadBlog server running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
});
