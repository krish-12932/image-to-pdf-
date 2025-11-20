class PhotoToPDFConverter {
    constructor() {
        this.photos = [];
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.photoSection = document.getElementById('photoSection');
        this.photoGrid = document.getElementById('photoGrid');
        this.controlsSection = document.getElementById('controlsSection');
        this.generatePdfBtn = document.getElementById('generatePdfBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.addMoreBtn = document.getElementById('addMoreBtn');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        
        // PDF options
        this.pageSize = document.getElementById('pageSize');
        this.orientation = document.getElementById('orientation');
        this.imageFit = document.getElementById('imageFit');
        this.quality = document.getElementById('quality');
    }

    attachEventListeners() {
        // Upload area events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        
        // File input change
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Button events
        this.generatePdfBtn.addEventListener('click', this.generatePDF.bind(this));
        this.clearAllBtn.addEventListener('click', this.clearAllPhotos.bind(this));
        this.addMoreBtn.addEventListener('click', () => this.fileInput.click());
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        this.processFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
    }

    processFiles(files) {
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.photos.push({
                        id: Date.now() + Math.random(),
                        name: file.name,
                        size: file.size,
                        dataUrl: e.target.result
                    });
                    this.updatePhotoGrid();
                    this.updateUI();
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Clear file input
        this.fileInput.value = '';
    }

    updatePhotoGrid() {
        this.photoGrid.innerHTML = '';
        
        this.photos.forEach(photo => {
            const photoElement = document.createElement('div');
            photoElement.className = 'photo-item';
            photoElement.innerHTML = `
                <img src="${photo.dataUrl}" alt="${photo.name}">
                <button class="remove-btn" data-id="${photo.id}">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div class="photo-info">
                    <div class="font-medium truncate">${photo.name}</div>
                    <div class="text-xs opacity-75">${this.formatFileSize(photo.size)}</div>
                </div>
            `;
            
            // Add remove functionality
            const removeBtn = photoElement.querySelector('.remove-btn');
            removeBtn.addEventListener('click', () => this.removePhoto(photo.id));
            
            this.photoGrid.appendChild(photoElement);
        });
    }

    removePhoto(photoId) {
        this.photos = this.photos.filter(photo => photo.id !== photoId);
        this.updatePhotoGrid();
        this.updateUI();
    }

    clearAllPhotos() {
        this.photos = [];
        this.updatePhotoGrid();
        this.updateUI();
    }

    updateUI() {
        if (this.photos.length > 0) {
            this.photoSection.classList.remove('hidden');
            this.controlsSection.classList.remove('hidden');
        } else {
            this.photoSection.classList.add('hidden');
            this.controlsSection.classList.add('hidden');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async generatePDF() {
        if (this.photos.length === 0) {
            alert('Please add at least one photo to generate a PDF.');
            return;
        }

        this.showLoading(true);

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: this.orientation.value,
                unit: 'mm',
                format: this.pageSize.value
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            for (let i = 0; i < this.photos.length; i++) {
                if (i > 0) {
                    pdf.addPage();
                }

                const photo = this.photos[i];
                await this.addImageToPDF(pdf, photo.dataUrl, pageWidth, pageHeight);
            }

            // Save the PDF
            const fileName = `photo-to-pdf-${Date.now()}.pdf`;
            pdf.save(fileName);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async addImageToPDF(pdf, dataUrl, pageWidth, pageHeight) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const imgWidth = img.width;
                const imgHeight = img.height;
                const pageRatio = pageWidth / pageHeight;
                const imgRatio = imgWidth / imgHeight;

                let finalWidth, finalHeight, x, y;

                switch (this.imageFit.value) {
                    case 'contain':
                        if (imgRatio > pageRatio) {
                            finalWidth = pageWidth;
                            finalHeight = pageWidth / imgRatio;
                        } else {
                            finalHeight = pageHeight;
                            finalWidth = pageHeight * imgRatio;
                        }
                        x = (pageWidth - finalWidth) / 2;
                        y = (pageHeight - finalHeight) / 2;
                        break;

                    case 'fill':
                        finalWidth = pageWidth;
                        finalHeight = pageHeight;
                        x = 0;
                        y = 0;
                        break;

                    case 'actual':
                        const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
                        finalWidth = imgWidth * scale;
                        finalHeight = imgHeight * scale;
                        x = (pageWidth - finalWidth) / 2;
                        y = (pageHeight - finalHeight) / 2;
                        break;
                }

                // Add image with appropriate quality
                const qualityMap = {
                    'high': 1.0,
                    'medium': 0.8,
                    'low': 0.6
                };

                pdf.addImage(dataUrl, 'JPEG', x, y, finalWidth, finalHeight, undefined, qualityMap[this.quality.value]);
                resolve();
            };
            img.src = dataUrl;
        });
    }

    showLoading(show) {
        if (show) {
            this.loadingIndicator.classList.remove('hidden');
        } else {
            this.loadingIndicator.classList.add('hidden');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PhotoToPDFConverter();
});
