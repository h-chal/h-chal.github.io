fetch('quotes.json')
  .then(response => response.json())
  .then(data => {
    const quoteList = document.getElementById('quote-list');
    data.reverse().forEach(quote => {
      const article = document.createElement('article');
      article.className = 'quote-entry';

      const blockquote = document.createElement('blockquote');
      const p = document.createElement('p');
      p.textContent = quote.text;
      blockquote.appendChild(p);
      article.appendChild(blockquote);

      const footer = document.createElement('footer');

      if (quote.author) {
        footer.innerHTML += `<strong>${quote.author}</strong>`;
      }

      if (quote.commentary) {
        footer.innerHTML += (quote.author ? '. ' : '') + quote.commentary;
      }

      if (quote.author || quote.commentary) {
        article.appendChild(footer);
      }

      const br = document.createElement('br');
      article.appendChild(br);

      quoteList.appendChild(article);
    });
  })
  .catch(error => {
    console.error('Error loading quotes:', error);
  });
