import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';
import { toPng, toJpeg, toBlob, toPixelData, toSvg } from 'html-to-image';

let iconSize = 100;
let itemCounter = 1;

// To Remove
const el = {
  sidebar: document.querySelector('.sidebar__fields'),
  upcForm: document.querySelector('#upc_form'),
  shipForm: document.querySelector('#shipping_form'),
  upcLabel: document.querySelector('#upc_title'),
  shipLabel: document.querySelector('#shipping_title'),
  preview: document.querySelector('.preview'),
  brand: document.querySelector('#brand'),
  sku: document.querySelector('#sku'),
  description: document.querySelector('#description'),
  controls: document.querySelector('.preview__controls'),
  printHeaders: document.querySelectorAll('.print-header'),
  labels: document.querySelectorAll('.label'),
  printLogos: document.querySelectorAll('.print-logo'),
  printDescriptions: document.querySelectorAll('.print-description'),
  printItemMasters: document.querySelectorAll('.print-item-master'),
  printBoxSkus: document.querySelectorAll('.print-box-sku'),
  printBoxSkusSapona: document.querySelectorAll('.sapona .print-box-sku'),
  printSkus: document.querySelectorAll('.print-sku'),

  sidebarItemTitle: document.querySelector('.sidebar__item-title'),
};

// Sidebar Field Updates
const fieldInit = (item) => {
  let elementIndex = item.id.replace('item_', '');

  // Call the update functions immediately
  brandUpdate(item, elementIndex);
  skuUpdate(item, elementIndex);
  descriptionUpdate(item, elementIndex);

  // Add the event listeners
  item.querySelector('.brand-field').addEventListener('input', () => brandUpdate(item, elementIndex));
  item.querySelector('.sku-field').addEventListener('input', () => skuUpdate(item, elementIndex));
  item.querySelector('.description-field').addEventListener('input', () => descriptionUpdate(item, elementIndex));
};

window.addEventListener('load', () => {
  loadSidebarData();
  document.querySelectorAll('.sidebar__fields .item').forEach(fieldInit);
});

const saveSidebarData = (save = false) => {
  const itemsData = Array.from(document.querySelectorAll('.sidebar__fields .item')).map(item => {
    const itemId = item.id.replace('item_', '');
    const brand = item.querySelector('.brand-field').value;
    const sku = item.querySelector('.sku-field').value;
    const description = item.querySelector('.description-field').value;
    return { itemId, brand, sku, description };
  });

  // Only save to localStorage if there's at least one item with data; Prevents overwriting localStorage with onload
  const hasData = itemsData.some(item => item.sku || item.description);

  if (itemsData.length > 1 || (itemsData.length === 1 && hasData) || save) {
    localStorage.setItem('sidebarData', JSON.stringify(itemsData));
  }
}

const loadSidebarData = () => {
  let itemsData = JSON.parse(localStorage.getItem('sidebarData'));
  if (itemsData) {
    itemsData = itemsData.sort((a, b) => a.itemId - b.itemId);

    itemsData.forEach(data => {
      const existingItem = document.querySelector(`#item_${data.itemId}`);
      if (existingItem) {
        existingItem.querySelector('.brand-field').value = data.brand;
        existingItem.querySelector('.sku-field').value = data.sku;
        existingItem.querySelector('.description-field').value = data.description;
        
        brandUpdate(existingItem, data.itemId);
        skuUpdate(existingItem, data.itemId);
        descriptionUpdate(existingItem, data.itemId);
      } else {
        console.log(data.itemId, data.brand, data.sku, data.description);
        createItem(data.itemId, false, data.brand, data.sku, data.description);
      }
    });
    // Set itemCounter to the highest itemId
    itemCounter = Math.max(...itemsData.map(item => parseInt(item.itemId)));
  }
}

const brandUpdate = (element, index) => {
  let pageItem = document.querySelector('#page_item_' + index);
  let skuValue = element.querySelector('.sku-field').value.toUpperCase() ||  defaults(element).sku;
  let descriptionValue = element.querySelector('.description-field').value || defaults(element).description;
  let sidebarItemBrand = element.querySelectorAll('.item__title-brand');
  
  // Update Preview class
  // const previewClassesToRemove = ['preview--brenthaven', 'preview--gumdrop', 'preview--vault'];
  // previewClassesToRemove.forEach((className) => el.preview.classList.remove(className));
  // el.preview.classList.add(`preview--${defaults.brandField}`);

  // const sidebarClassesToRemove = ['sidebar--brenthaven', 'sidebar--gumdrop', 'sidebar--vault'];
  // sidebarClassesToRemove.forEach((className) => el.sidebar.classList.remove(className));
  // el.sidebar.classList.add(`sidebar--${defaults.brandField}`);

  pageItem.classList.add(`label--${defaults(element).brandField}`)
  pageItem.querySelector('.print__header img').src = defaults(element).logoSrc;
  pageItem.querySelector('.print-logo').src = defaults(element).logoSrc;

  updateTextContent(pageItem.querySelectorAll('.print-description'), descriptionValue);
  updateTextContent(pageItem.querySelectorAll('.print-sku'), skuValue);

  // Update input field placeholders with defaults
  updateTextContent(sidebarItemBrand, `(${defaults(element).brandField})`);
  element.querySelector('.sku-field').placeholder = defaults(element).sku;
  element.querySelector('.description-field').placeholder = defaults(element).description;

  skuUpdate(element, index);

  saveSidebarData();
}

const skuUpdate = (element, index) => {
  let skuValue = element.querySelector('.sku-field').value.toUpperCase() || defaults(element).sku;
  let pageItem = document.querySelector('#page_item_' + index);
  let pageItemSku = pageItem.querySelectorAll('.print-sku');
  let sidebarItemSku = element.querySelectorAll('.item__title-sku');

  updateTextContent(pageItemSku, skuValue);
  updateTextContent(sidebarItemSku, skuValue);
  dataMatrixUpdate(skuValue, pageItem);

  saveSidebarData();
}

const descriptionUpdate = (element, index) => {
  let descriptionValue = element.querySelector('.description-field').value || defaults(element).description;
  let pageItemDescription = document.querySelectorAll('#page_item_' + index + ' .print-description');

  updateTextContent(pageItemDescription, descriptionValue);

  saveSidebarData();
}

const itemAdder = () => {
  let addButton = document.querySelector('.sidebar__add-item');

  addButton.addEventListener('click', () => {
    itemCounter++;
    createItem(itemCounter, true);
  });
}

const createItem = (counter, save, brand,  sku = '', description = '') => {
  let sidebarItemContainer = document.querySelector('.sidebar__fields');
  let pageItemContainer = document.querySelector('.preview__content');

  let sidebarTemplate = sidebarItemTemplate(counter, brand, sku, description);
  let pageTemplate = pageItemTemplate(counter, brand, sku, description);

  document.querySelectorAll('.item__heading--active').forEach(item => item.classList.remove('item__heading--active'));
  document.querySelectorAll('.item__form--active').forEach(item => item.classList.remove('item__form--active'));
  document.querySelectorAll('.page-item--active').forEach(item => item.classList.remove('page-item--active'));
  sidebarItemContainer.insertAdjacentHTML('afterbegin', sidebarTemplate);
  pageItemContainer.insertAdjacentHTML('afterbegin', pageTemplate);
  
  let newItem = document.getElementById(`item_${counter}`);
  fieldInit(newItem);
  enumerator();
  if(save){ 
    saveSidebarData() 
  }
}

const sidebarItemTemplate = (counter, brand, sku = '', description = '') => {
  console.log(counter, brand, sku, description);
  return `
    <li class="sidebar__item item" id="item_${counter}">
      <div class="item__heading item__heading--active">
        <h2 class="item__title">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-qr-code"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
          <span class="item__title-text">
            <span class="item__title-sku">${sku}</span>
            <span class="item__title-brand">(${brand})</span>
          </span>
        </h2>
        <div class="item__buttons">
          <button class="item__button item__button--download"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down-to-line"><path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/></svg></button>
          <button class="item__button item__button--delete"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button>
        </div>
      </div>
      <form id="upc_form_${counter}" class="item__form item__form--active labelinator">
        <fieldset>
          <div class="field">
            <label class="field__label" for="brand_${counter}">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="lucide lucide-hexagon">
                <path
                  d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              Brand
            </label>
            <select name="brand" id="brand_${counter}" class="brand-field">
              <option value="brenthaven" ${brand === 'brenthaven' ? 'selected' : ''}>Brenthaven</option>
              <option value="gumdrop" ${brand === 'gumdrop' ? 'selected' : ''}>Gumdrop</option>
              <option value="vault" ${brand === 'vault' ? 'selected' : ''}>Vault</option>
            </select>
          </div>

          <div class="field">
            <label class="field__label" for="sku_${counter}">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="lucide lucide-tag">
                <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
                <path d="M7 7h.01" />
              </svg>
              SKU
            </label>
            <input type="text" id="sku_${counter}" class="sku-field" placeholder="1050001" value="${sku}">
          </div>

          <div class="field">
            <label class="field__label" for="description_${counter}">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="lucide lucide-text">
                <path d="M17 6.1H3" />
                <path d="M21 12.1H3" />
                <path d="M15.1 18H3" />
              </svg>
              Description
            </label>
            <textarea id="description_${counter}" class="description-field" rows="5" placeholder="Edge Smart Connect Keyboard">${description}</textarea>
          </div>
        </fieldset>
      </form>
    </li>`;
};

const pageItemTemplate = (counter, brand, sku = '', description = '') => {
  return `
  <div class="page page--a4 page-item--active" id="page_item_${counter}">
    <div class="page__content print">

      <header class="print__header">
        <h1 class="print-header">
          <img src="dist/img/${brand}_min.png">
        </h1>
        <span class="print__magenta">Magenta die line represents die cut of label &amp; does not print</span>
      </header>

      <main class="print__content label">
        <div class="label__brand">
          <img class="label__logo print-logo" src="dist/img/${brand}_min.png">
        </div>

        <div class="label__description print-description">${description}</div>

        <div class="label__internal">
          <div class="label__datamatrix">Data Matrix</div>
        </div>

        <div class="label__info">
          <span class="label__item">
            <span class="label__item-sku print-sku">${sku}</span>
          </span>
        </div>
      </main>

    </div>
  </div>`;
}

const itemRemover = () => {
  let sidebarItemContainer = document.querySelector('.sidebar__fields');

  sidebarItemContainer.addEventListener('click', (event) => {
    let button = event.target.closest('.item__button--delete');
    if (button) {
      if(button.classList.contains('item__button--delete-confirm')) {
        button.classList.remove('item__button--delete-confirm');
        
        let item = button.closest('.item');
        let pageItem = document.getElementById(item.id.replace('item_', 'page_item_'));
        item.remove();
        pageItem.remove();
        enumerator();
        saveSidebarData(true);
      } else {
        document.querySelectorAll('.item__button--delete-confirm').forEach(button => button.classList.remove('item__button--delete-confirm'));
        button.classList.add('item__button--delete-confirm');
      }
    }
  });

  document.addEventListener('click', (event) => {
    let button = event.target.closest('.item__button--delete-confirm');
    if (!button) {
      document.querySelectorAll('.item__button--delete-confirm').forEach(button => button.classList.remove('item__button--delete-confirm'));
    }
  });
}

const enumerator = (elements) => {
  const sidebarItems = document.querySelectorAll('.sidebar__item');
  const lastItemIndex = sidebarItems.length - 1;
  sidebarItems.forEach((item, index) => {
    const number = lastItemIndex - index + 1;
    item.querySelector('.item__title').setAttribute('data-number', number);
    const itemId = item.id.replace('item_', '');
    const pageItem = document.querySelector(`#page_item_${itemId}`);
    pageItem.setAttribute('data-number', number);
  });
}

const savePNG = async (elements) => {
  const button = event.target.closest('.item__button--download');
  if (button) {
    const item = button.closest('.item');
    const itemId = item.id.replace('item_', '');
    const pageItem = document.querySelector(`#page_item_${itemId}`);
    const label = pageItem.querySelector('.print');
    const skuField = item.querySelector('.sku-field');
    const sku = skuField.value.toUpperCase() || skuField.placeholder;

    const pdf = new jsPDF('p', 'in', 'a4', true);
    await htmlToImage.toPng(label, {
      quality: 1,
      pixelRatio: 6,
    })
      .then(function (dataUrl) {
        var img = new Image();
        img.src = dataUrl;

        const originalWidth = label.offsetWidth;
        const originalHeight = label.offsetHeight;

        const imgWidth = pixelToInch(originalWidth);
        const imgHeight = pixelToInch(originalHeight);

        const x = (8.3 - imgWidth) / 2;
        const y = (11.7 - imgHeight) / 2;

        const imgData = dataUrl;

        pdf.addImage(imgData, 'png', x, y, imgWidth, imgHeight);

        //pdf.addImage(dataUrl, 'PNG', 0, 0, 8.27, 11.69); // Add image to A4 paper, adjust the dimensions as needed
        pdf.save(`item_${sku}.pdf`);
      });
  }
}

// Utils
const updateTextContent = (nodeList, value) => {
  nodeList.forEach((node) => node.textContent = value);
};

const dataMatrixUpdate = (sku, element) => {
  let skuValue = sku || defaults(element).sku;
  let dataMatrixContainers = element.querySelectorAll('.label__datamatrix');

  dataMatrixContainers.forEach(dm => {
    let dataMatrix = DATAMatrix({
      msg: skuValue,
      dim: iconSize,
      pad: 0,
      ecl: "L",
    });

    dm.classList.add('label__datamatrix--active');
    dm.innerHTML = '';

    dm.appendChild(dataMatrix);
  });
}

const defaults = (element) => {
  const brandField = element.querySelector('.brand-field').value;
  let logoSrc, headerText, linkText, itemMaster, sku, upc, description;

  switch (brandField) {
    case 'brenthaven':
      logoSrc = 'dist/img/brenthaven_min.png';
      headerText = 'Brenthaven';
      linkText = 'https://brenthaven.com';
      itemMaster = '1050';
      sku = '1050001';
      upc = '730791105003';
      description = 'Edge Smart Connect Keyboard';
      break;
    case 'gumdrop':
      logoSrc = 'dist/img/gumdrop_min.png';
      headerText = 'Gumdrop';
      linkText = 'https://www.gumdropcases.com';
      itemMaster =  '01D015';
      sku = '01D015E01-20';
      upc = '818090026011';
      description = 'DropTech for Dell Latitude 3340 (2-in-1)';
      break;
    default:
      logoSrc = 'dist/img/vault_min.png';
      headerText = 'Vault';
      linkText = 'https://byvault.com';
      itemMaster =  '12A001';
      sku = '12A001E01-20';
      upc = '818090025960';
      description = 'Simplicity Stand for iPad';
  }
  
  return { brandField, logoSrc, headerText, linkText, itemMaster, sku, upc, description };
}

const itemAccordion = () => {
  let sidebarContainer = document.querySelector('.sidebar__fields');

  sidebarContainer.addEventListener('click', (event) => {
    let itemTitle = event.target.closest('.item__heading');
    let itemButtons = event.target.closest('.item__buttons'); // Prevents triggering from buttons
    if (itemTitle && !itemButtons) {
      let itemForm = itemTitle.nextElementSibling;
      itemForm.classList.toggle('item__form--active');
      itemTitle.classList.toggle('item__heading--active');
      
      // Get the item id
      let itemId = itemTitle.closest('.item').id.replace('item_', '');
      
      // Toggle the page item active class
      let pageItem = document.querySelector(`#page_item_${itemId}`);
      pageItem.classList.toggle('page-item--active');
      
      // Scroll to the active page item
      let previewContent = document.querySelector('.preview__content');
      previewContent.scrollTo({
        top: pageItem.offsetTop - 20,
        behavior: 'smooth'
      });
    }
  });
}

const pixelToInch = (pixels) => {
  const dpi = 96; // Assuming a standard DPI of 96
  return parseFloat((pixels / dpi).toFixed(2));
}

const hoverer = () => {
  let sidebar = document.querySelector('.sidebar__fields');

  sidebar.addEventListener('mouseover', (event) => {
    let item = event.target.closest('.sidebar__item');
    if (item && !item.contains(event.relatedTarget)) {
      let itemId = item.id.replace('item_', '');
      let pageItem = document.querySelector(`#page_item_${itemId}`);
      pageItem.classList.add('page-item--hover');
    }
  });

  sidebar.addEventListener('mouseout', (event) => {
    let item = event.target.closest('.sidebar__item');
    if (item && !item.contains(event.relatedTarget)) {
      let itemId = item.id.replace('item_', '');
      let pageItem = document.querySelector(`#page_item_${itemId}`);
      pageItem.classList.remove('page-item--hover');
    }
  });
}

// Init
itemAccordion();
itemAdder();
itemRemover();
hoverer();
el.sidebar.addEventListener('click', savePNG);