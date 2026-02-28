# 🌿 GreenLeaf - Plant Website

A beautiful, modern plant website with smooth animations and responsive design.

## 🚀 Quick Start

Simply open `index.html` in your browser to view the website locally.

## 📦 Deployment to GitHub Pages

### Step 1: Generate a New GitHub Token

1. Go to [GitHub Token Settings](https://github.com/settings/tokens/new)
2. Give it a name: `cortensor-deploy`
3. Select scopes:
   - ✅ `repo` (Full control of private repositories)
4. Click "Generate token"
5. **Copy the token immediately** (you won't see it again!)

### Step 2: Push to GitHub

Run these commands in your terminal:

```bash
# Remove the old remote URL
git remote remove origin

# Add the remote without credentials
git remote add origin https://github.com/0xshobha/cortensor.git

# Push to GitHub (it will prompt for credentials)
git push -u origin main
```

When prompted:
- **Username:** `0xshobha`
- **Password:** Paste your new token

### Step 3: Enable GitHub Pages

1. Go to your repository: https://github.com/0xshobha/cortensor
2. Click on **Settings** tab
3. Scroll down to **Pages** section (left sidebar)
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**

### Step 4: Access Your Live Site

Your website will be live at:
```
https://0xshobha.github.io/cortensor/
```

It may take 1-2 minutes for the site to deploy.

## 🎨 Features

- Modern gradient design with nature theme
- Smooth scroll animations
- Responsive layout (mobile-friendly)
- Interactive plant cards with hover effects
- Plant care tips section
- Sticky navigation bar

## 📁 Project Structure

```
.
├── index.html      # Main HTML file
├── styles.css      # All styling and animations
├── script.js       # Interactive features
└── README.md       # This file
```

## 🛠️ Technologies Used

- HTML5
- CSS3 (Gradients, Animations, Flexbox, Grid)
- Vanilla JavaScript
- No frameworks or dependencies needed!

## 📝 Customization

### Change Colors
Edit the gradient colors in `styles.css`:
```css
.hero {
    background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%);
}
```

### Add More Plants
Add new plant cards in `index.html`:
```html
<div class="plant-card">
    <div class="plant-image">🌺</div>
    <h3>Your Plant</h3>
    <p>Description</p>
    <span class="price">$XX</span>
</div>
```

## 📧 Contact

- Email: shobhavash09@gmail.com
- GitHub: [@0xshobha](https://github.com/0xshobha)

---

Made with 💚 by 0xshobha
