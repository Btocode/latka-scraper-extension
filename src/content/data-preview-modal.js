// Data Preview Modal functionality for Latka Data Scraper
import '../assets/data-preview-modal.css';

export function showAllDataModal() {
  // Get scraped data from sidebar module
  const scrapedTableData = window.getScrapedTableData ? window.getScrapedTableData() : [];
  
  if (scrapedTableData.length === 0) return;
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'latka-modal';
  modal.id = 'data-modal';
  
  // Get column headers from first object
  const headers = scrapedTableData.length > 0 ? Object.keys(scrapedTableData[0]) : [];
  const dataRows = scrapedTableData; // All rows are data rows now
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>All Scraped Data (${dataRows.length} companies)</h3>
        <button class="modal-close" id="close-modal">×</button>
      </div>
      <div class="modal-body">
        <div class="table-actions">
          <div class="table-info">
            Showing ${dataRows.length} companies
          </div>
          <div class="table-controls">
            <input type="text" class="search-input" placeholder="Search companies..." id="search-input">
            <button class="export-btn" id="export-modal-btn">
              📤 Export CSV
            </button>
          </div>
        </div>
        <div class="modal-table-container" id="table-container">
          ${generateDataTable(headers, dataRows)}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners
  const closeBtn = document.getElementById('close-modal');
  closeBtn.addEventListener('click', closeModal);
  
  const exportBtn = document.getElementById('export-modal-btn');
  exportBtn.addEventListener('click', () => exportModalData(scrapedTableData));
  
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    filterTable(headers, dataRows, e.target.value);
  });
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Close on escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

function generateDataTable(headers, dataRows, filteredRows = null) {
  const rowsToShow = filteredRows || dataRows;
  
  if (rowsToShow.length === 0) {
    return `
      <div class="modal-empty-state">
        <div class="empty-icon">🔍</div>
        <h4>No results found</h4>
        <p>Try adjusting your search criteria</p>
      </div>
    `;
  }
  
  return `
    <table class="modal-table">
      <thead>
        <tr>
          ${headers.map(header => `<th title="${header}">${header}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rowsToShow.map(row => `
          <tr>
            ${headers.map(header => {
              const cellValue = row[header] || '';
              // Format link fields with clickable links
              if ((header === 'Website' || header === 'LinkedIn' || header === 'Founder LinkedIn') && cellValue) {
                const links = cellValue.split(',').filter(link => link.trim()).map(link => {
                  const trimmedLink = link.trim();
                  const icon = header === 'LinkedIn' || header === 'Founder LinkedIn' ? '💼' : '🌐';
                  return `<a href="${trimmedLink}" target="_blank" rel="noopener noreferrer">${icon}</a>`;
                }).join(' ');
                return `<td title="${cellValue}">${links}</td>`;
              } else {
                return `<td title="${cellValue}">${cellValue}</td>`;
              }
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function filterTable(headers, dataRows, searchTerm) {
  const tableContainer = document.getElementById('table-container');
  const tableInfo = document.querySelector('.table-info');
  
  if (!searchTerm.trim()) {
    // Show all rows
    tableContainer.innerHTML = generateDataTable(headers, dataRows);
    tableInfo.textContent = `Showing ${dataRows.length} companies`;
    return;
  }
  
  // Filter rows based on search term
  const searchLower = searchTerm.toLowerCase();
  const filteredRows = dataRows.filter(row => {
    return headers.some(header => {
      const cellValue = row[header] || '';
      return cellValue.toLowerCase().includes(searchLower);
    });
  });
  
  tableContainer.innerHTML = generateDataTable(headers, dataRows, filteredRows);
  tableInfo.textContent = `Showing ${filteredRows.length} of ${dataRows.length} companies`;
}

function closeModal() {
  const modal = document.getElementById('data-modal');
  if (modal) {
    modal.remove();
  }
}

async function exportModalData(scrapedTableData) {
  const exportBtn = document.getElementById('export-modal-btn');
  const originalHTML = exportBtn.innerHTML;
  
  exportBtn.innerHTML = '⏳ Exporting...';
  exportBtn.disabled = true;
  
  try {
    // Convert data to CSV format
    const csvData = convertDataToCSV(scrapedTableData);
    
    // Create and download CSV file
    const csvBlob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = csvUrl;
    downloadLink.download = `latka-data-${new Date().toISOString().split('T')[0]}.csv`;
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(csvUrl), 1000);
    
    exportBtn.innerHTML = '✅ Downloaded!';
    exportBtn.classList.add('success');
    
    if (window.showNotification) {
      window.showNotification('CSV file downloaded successfully!', 'success');
    }
    
  } catch (error) {
    exportBtn.innerHTML = '❌ Failed';
    exportBtn.classList.add('error');
    
    if (window.showNotification) {
      window.showNotification('Export failed. Please try again.', 'error');
    }
  }
  
  setTimeout(() => {
    exportBtn.innerHTML = originalHTML;
    exportBtn.classList.remove('success', 'error');
    exportBtn.disabled = false;
  }, 3000);
}

function convertDataToCSV(data) {
  if (data.length === 0) return '';
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create header row
  const headerRow = headers.map(header => {
    if (header.includes(',') || header.includes('"') || header.includes('\n')) {
      return '"' + header.replace(/"/g, '""') + '"';
    }
    return header;
  }).join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      let text = row[header] || '';
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        text = '"' + text.replace(/"/g, '""') + '"';
      }
      return text;
    }).join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
}

// Enhanced modal with loading state
export function showLoadingModal(message = 'Loading data...') {
  const modal = document.createElement('div');
  modal.className = 'latka-modal';
  modal.id = 'loading-modal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Processing Data</h3>
      </div>
      <div class="modal-body">
        <div class="modal-loading">
          <div class="loading-spinner"></div>
          <span>${message}</span>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  return {
    close: () => {
      const loadingModal = document.getElementById('loading-modal');
      if (loadingModal) {
        loadingModal.remove();
      }
    },
    updateMessage: (newMessage) => {
      const messageSpan = modal.querySelector('.modal-loading span');
      if (messageSpan) {
        messageSpan.textContent = newMessage;
      }
    }
  };
}

// Error modal
export function showErrorModal(title, message, details = null) {
  const modal = document.createElement('div');
  modal.className = 'latka-modal';
  modal.id = 'error-modal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>❌ ${title}</h3>
        <button class="modal-close" id="close-error-modal">×</button>
      </div>
      <div class="modal-body">
        <div style="padding: 1rem 0; color: var(--gray-700); line-height: 1.6;">
          <p style="margin: 0 0 1rem 0; font-weight: 500;">${message}</p>
          ${details ? `
            <details style="margin-top: 1rem;">
              <summary style="cursor: pointer; font-weight: 500; color: var(--gray-600);">
                Technical Details
              </summary>
              <pre style="margin-top: 0.5rem; padding: 0.75rem; background: var(--gray-100); border-radius: 0.5rem; font-size: 0.875rem; overflow-x: auto;">${details}</pre>
            </details>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners
  const closeBtn = document.getElementById('close-error-modal');
  closeBtn.addEventListener('click', () => {
    const errorModal = document.getElementById('error-modal');
    if (errorModal) {
      errorModal.remove();
    }
  });
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      const errorModal = document.getElementById('error-modal');
      if (errorModal) {
        errorModal.remove();
      }
    }
  });
  
  // Close on escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      const errorModal = document.getElementById('error-modal');
      if (errorModal) {
        errorModal.remove();
      }
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

// Expose functions to global scope for integration with other modules
window.showAllDataModal = showAllDataModal;
window.showLoadingModal = showLoadingModal;
window.showErrorModal = showErrorModal;
