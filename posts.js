// Yeh file SQL database ki jagah hai.
// Agar aap baad mein MySQL ya PostgreSQL add karna chahein,
// toh is data ko database mein daal sakte hain.

const posts = [
  {
    id: 1,
    title: "Building Scalable Node.js Applications",
    category: "Web",
    author: "Ahmad Ansari",
    date: "March 10, 2026",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
    featured: true,
    summary: "Learn how to structure and scale Node.js apps for production environments with best practices.",
    content: `
      <p>Node.js has become one of the most popular runtimes for building web applications. 
      Its non-blocking I/O model makes it perfect for high-concurrency applications.</p>
      
      <h3>Why Node.js?</h3>
      <p>Node.js uses an event-driven, non-blocking I/O model that makes it lightweight and efficient. 
      This is ideal for data-intensive real-time applications that run across distributed devices.</p>
      
      <h3>Key Principles</h3>
      <p><strong>1. Use Clustering:</strong> Node.js runs on a single thread by default. Use the cluster module 
      or PM2 to take advantage of multi-core systems.</p>
      <p><strong>2. Async/Await:</strong> Always use async/await instead of callbacks to avoid callback hell 
      and make your code readable.</p>
      <p><strong>3. Environment Variables:</strong> Never hardcode secrets. Use .env files with dotenv package 
      for managing configuration.</p>
      
      <h3>Deployment Best Practices</h3>
      <p>When deploying Node.js applications, consider using Docker containers for consistency across 
      environments. Docker ensures your app runs the same way in development, staging, and production.</p>
      
      <p>Tools like PM2 help manage Node.js processes in production, providing automatic restart on crashes, 
      load balancing, and log management.</p>
    `
  },
  {
    id: 2,
    title: "Docker Containerization for Beginners",
    category: "Web",
    author: "Ahmad Ansari",
    date: "March 15, 2026",
    image: "https://images.unsplash.com/photo-1605745341112-85968b19335b?w=800&q=80",
    featured: false,
    summary: "A complete guide to containerizing your applications with Docker from scratch.",
    content: `
      <p>Docker revolutionized how we build, ship, and run applications. By packaging your app and its 
      dependencies into a container, Docker eliminates the "works on my machine" problem.</p>
      
      <h3>What is Docker?</h3>
      <p>Docker is a platform that uses OS-level virtualization to deliver software in packages called 
      containers. Containers are isolated from each other and bundle their own software, libraries, 
      and configuration files.</p>
      
      <h3>Key Docker Concepts</h3>
      <p><strong>Image:</strong> A read-only template with instructions for creating a Docker container. 
      Think of it as a blueprint or a snapshot of your application.</p>
      <p><strong>Container:</strong> A runnable instance of an image. You can create, start, stop, move, 
      or delete a container using Docker commands.</p>
      <p><strong>Dockerfile:</strong> A text file that contains all the commands to build an image. 
      Each instruction creates a new layer in the image.</p>
      
      <h3>Your First Dockerfile</h3>
      <p>A basic Dockerfile starts with a base image (FROM), sets a working directory (WORKDIR), 
      copies your files (COPY), installs dependencies (RUN), exposes a port (EXPOSE), and defines 
      the startup command (CMD).</p>
    `
  },
  {
    id: 3,
    title: "The Art of Digital Minimalism",
    category: "Lifestyle",
    author: "Sara Khan",
    date: "March 8, 2026",
    image: "https://images.unsplash.com/photo-1484627147104-f5197bcd6651?w=800&q=80",
    featured: false,
    summary: "How reducing digital clutter can improve focus, productivity, and mental well-being.",
    content: `
      <p>In a world where we are constantly bombarded with notifications, emails, and social media updates, 
      digital minimalism offers a refreshing alternative — a more intentional relationship with technology.</p>
      
      <h3>What is Digital Minimalism?</h3>
      <p>Digital minimalism is a philosophy of technology use in which you focus your online time on a small 
      number of carefully selected and optimized activities that strongly support things you value, and then 
      miss out on everything else.</p>
      
      <h3>Benefits</h3>
      <p><strong>Improved Focus:</strong> Fewer digital distractions mean more time for deep work — the kind 
      of work that truly matters.</p>
      <p><strong>Better Sleep:</strong> Reducing screen time, especially before bed, significantly improves 
      sleep quality.</p>
      <p><strong>Stronger Relationships:</strong> When you're not constantly checking your phone, you're more 
      present in real-world interactions.</p>
      
      <h3>Getting Started</h3>
      <p>Begin with a 30-day digital declutter. Remove all optional technologies from your life. After 30 days, 
      reintroduce only the tools that provide significant value.</p>
    `
  },
  {
    id: 4,
    title: "Machine Learning: Where to Start in 2026",
    category: "Apps",
    author: "Usman Ali",
    date: "March 5, 2026",
    image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80",
    featured: false,
    summary: "A roadmap for beginners who want to break into machine learning and AI development.",
    content: `
      <p>Machine learning has never been more accessible. With powerful libraries, free courses, and cloud 
      platforms, anyone with determination can learn ML in 2026.</p>
      
      <h3>The Learning Path</h3>
      <p><strong>Step 1 - Python Basics:</strong> Learn Python first. Focus on data structures, functions, 
      and object-oriented programming.</p>
      <p><strong>Step 2 - Mathematics:</strong> Linear algebra, calculus, and statistics are the foundation 
      of ML algorithms. You don't need to be an expert, but a basic understanding is essential.</p>
      <p><strong>Step 3 - Data Science Libraries:</strong> Learn NumPy, Pandas, and Matplotlib for data 
      manipulation and visualization.</p>
      <p><strong>Step 4 - ML Frameworks:</strong> Start with Scikit-learn for classical ML, then move to 
      TensorFlow or PyTorch for deep learning.</p>
      
      <h3>Resources</h3>
      <p>Some excellent free resources include fast.ai for practical deep learning, Andrew Ng's courses on 
      Coursera, and Kaggle for hands-on practice with real datasets.</p>
    `
  },
  {
    id: 5,
    title: "Exploring Lahore: A Food Lover's Guide",
    category: "Travel",
    author: "Fatima Malik",
    date: "February 28, 2026",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    featured: false,
    summary: "Discover the culinary treasures of Lahore — from street food to five-star restaurants.",
    content: `
      <p>Lahore, the cultural heart of Pakistan, is a paradise for food lovers. The city's food culture 
      is a rich blend of Mughal influences, local traditions, and modern innovation.</p>
      
      <h3>Must-Try Street Food</h3>
      <p><strong>Gawalmandi Food Street:</strong> This iconic street is famous for its traditional Lahori 
      breakfast — paye (trotters), halwa puri, and nihari. Best enjoyed early morning.</p>
      <p><strong>Data Darbar Area:</strong> The lanes around this shrine are famous for hot chai, 
      freshly baked bread, and seekh kebabs cooked over open flame.</p>
      
      <h3>Famous Restaurants</h3>
      <p>Cuckoo's Den near Walled City offers traditional food with a stunning view. Andaaz is known 
      for its BBQ, while Bundu Khan is a classic for mughlai cuisine.</p>
      
      <h3>Sweet Treats</h3>
      <p>Don't leave without trying Lahori rabri, kulfi from old city vendors, and the famous 
      sohan halwa. Lucky's ice cream is a local institution loved by generations.</p>
    `
  },
  {
    id: 6,
    title: "CSS Grid vs Flexbox: When to Use What",
    category: "Web",
    author: "Ahmad Ansari",
    date: "February 22, 2026",
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80",
    featured: false,
    summary: "A practical comparison of CSS Grid and Flexbox to help you choose the right layout tool.",
    content: `
      <p>CSS Grid and Flexbox are two powerful layout systems in modern CSS. Understanding when to use 
      each one is a key skill for any front-end developer.</p>
      
      <h3>Flexbox — One Dimension</h3>
      <p>Flexbox is designed for one-dimensional layouts — either a row or a column. It's perfect for 
      navigation bars, card rows, centering content, and distributing space along a single axis.</p>
      <p>Use Flexbox when you have a group of items that need to be aligned or distributed along a 
      single direction.</p>
      
      <h3>CSS Grid — Two Dimensions</h3>
      <p>Grid is designed for two-dimensional layouts — rows AND columns simultaneously. It's perfect for 
      overall page layouts, image galleries, and complex UI patterns.</p>
      <p>Use Grid when you need to control both rows and columns, or when your layout is based on a 
      defined grid structure.</p>
      
      <h3>Best Practice</h3>
      <p>Use Grid for the macro layout (overall page structure) and Flexbox for the micro layout 
      (components within that structure). They work beautifully together.</p>
    `
  }
];

module.exports = posts;
