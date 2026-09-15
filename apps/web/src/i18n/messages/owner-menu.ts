import type { CategoryLayout, PublishedMenu } from '@/lib/restaurant-types';

import { formatCount } from '../format';
import type { Locale } from '../locale';

/** One of the two option lists of a product: variants or add-ons. */
interface OptionListCopy {
  add: string;
  legend: string;
  name: (position: number) => string;
  price: (position: number) => string;
  remove: (position: number) => string;
}

/**
 * The owner's menu screen: digitizing, publishing and editing the draft. Section,
 * product and restaurant names are the owner's content and only ever appear as
 * parameters.
 */
interface OwnerMenuCopy {
  digitizer: {
    digitize: string;
    digitized: string;
    digitizing: string;
    draft: {
      emptyBody: string;
      reviewBody: string;
      status: { changes: string; live: string; none: string };
      title: string;
      viewPublished: string;
      viewQrLink: string;
    };
    kicker: string;
    lede: string;
    loadDraftError: string;
    loadRestaurantsError: string;
    loading: string;
    page: (position: number) => string;
    pageAlt: (position: number, file: string) => string;
    photos: {
      body: string;
      change: string;
      hint: string;
      input: string;
      invalid: string;
      select: string;
      selected: string;
      title: string;
    };
    privacy: string;
    processing: { keepOpen: string; stages: readonly string[]; title: string };
    published: string;
    templateApplied: string;
    title: string;
  };
  manager: {
    actions: string;
    actionsFor: (name: string) => string;
    addProductTo: (section: string) => string;
    cancel: string;
    confirmDeleteProduct: (product: string) => string;
    confirmDeleteSection: (section: string) => string;
    delete: string;
    deleteFor: (product: string) => string;
    deleteSectionFor: (section: string) => string;
    edit: string;
    editFor: (name: string) => string;
    editSectionFor: (section: string) => string;
    empty: string;
    extras: OptionListCopy;
    layouts: Record<CategoryLayout, { description: string; label: string }>;
    makeAvailable: string;
    makeAvailableFor: (product: string) => string;
    markUnavailable: string;
    markUnavailableFor: (product: string) => string;
    moveDown: string;
    moveDownFor: (name: string) => string;
    moveUp: string;
    moveUpFor: (name: string) => string;
    newSection: string;
    notices: {
      imageUnidentified: string;
      productAvailable: string;
      productCreated: string;
      productDeleted: string;
      productUnavailable: string;
      productUpdated: string;
      productsReordered: string;
      sectionCreated: string;
      sectionDeleted: string;
      sectionUpdated: string;
      sectionsReordered: string;
    };
    optionNamePlaceholder: string;
    optionPricePlaceholder: string;
    optionsSummary: (variants: number, extras: number) => string;
    product: {
      basePrice: string;
      create: string;
      description: string;
      image: string;
      imageHint: string;
      imageInput: string;
      kicker: string;
      name: string;
      removeImage: string;
      save: string;
      section: string;
      titleEdit: string;
      titleNew: string;
    };
    saving: string;
    section: {
      kicker: string;
      layoutLegend: string;
      name: string;
      save: string;
      titleEdit: string;
      titleNew: string;
    };
    sectionEmpty: string;
    summary: (sections: number, products: number) => string;
    unavailable: string;
    variants: OptionListCopy;
  };
  publication: {
    confirm: { accept: string; back: string; body: string; kicker: string; title: string };
    heading: { changes: string; first: string; live: string };
    kicker: string;
    pill: { draft: string; live: string; unpublished: string };
    preview: string;
    previewDialog: { close: string; empty: string; eyebrow: string; kicker: string; title: string };
    publishChanges: string;
    publishFirst: string;
    publishing: string;
    status: { changes: string; first: string; live: string };
    templateLabel: string;
    templates: Record<PublishedMenu['template'], { description: string; label: string }>;
  };
}

export const ownerMenuCopy: Record<Locale, OwnerMenuCopy> = {
  en: {
    digitizer: {
      digitize: 'Digitize into draft',
      digitized: "Menu digitized. Review it and publish it when it's ready.",
      digitizing: 'Digitizing…',
      draft: {
        emptyBody: 'Your menu will appear here once you digitize it.',
        reviewBody: 'Review the result before updating your public menu.',
        status: {
          changes: 'There are changes in the draft. Your public menu keeps its previous version.',
          live: 'This is the same version that is published right now.',
          none: 'No menu is published yet. Your QR code will show Coming soon.',
        },
        title: 'Your menu draft',
        viewPublished: 'View published menu ↗',
        viewQrLink: 'View QR link ↗',
      },
      kicker: 'Restaurant menu',
      lede: 'Every change stays in a draft. You decide when your customers see it.',
      loadDraftError: "We couldn't load your menu draft.",
      loadRestaurantsError: "We couldn't load your restaurants. Please try again.",
      loading: 'Loading menu',
      page: (position) => `Page ${position}`,
      pageAlt: (position, file) => `Page ${position}: ${file}`,
      photos: {
        body: 'Use good light and sharp text. Include every page in full.',
        change: 'Change photos',
        hint: '1–5 files · JPG, PNG or WebP · 3 MB per photo',
        input: 'Menu photos',
        invalid: 'Choose 1 to 5 JPG, PNG or WebP photos, up to 3 MB each and 12 MB in total.',
        select: 'Select photos',
        selected: 'Selected photos',
        title: 'Upload photos of your menu',
      },
      privacy: 'Photos are sent to Gemini to read them and are not stored by Sirio.',
      processing: {
        keepOpen: "Keep this window open. You can review the draft when it's done.",
        stages: [
          'Reading the pages of your menu…',
          'Recognizing sections, dishes and prices…',
          'Working out variants and add-ons…',
          'Preparing the draft for your review…',
        ],
        title: 'Gemini is reading your menu',
      },
      published: 'Your public menu is updated. The QR code stays the same.',
      templateApplied: "Template applied to the draft. Publish it when you're happy with it.",
      title: 'Get the next version of your menu ready.',
    },
    manager: {
      actions: 'Actions ⌄',
      actionsFor: (name) => `Actions for ${name}`,
      addProductTo: (section) => `Add product to ${section}`,
      cancel: 'Cancel',
      confirmDeleteProduct: (product) => `Permanently delete “${product}”?`,
      confirmDeleteSection: (section) => `Permanently delete “${section}” and all its products?`,
      delete: 'Delete',
      deleteFor: (product) => `Delete ${product}`,
      deleteSectionFor: (section) => `Delete section ${section}`,
      edit: 'Edit',
      editFor: (name) => `Edit ${name}`,
      editSectionFor: (section) => `Edit section ${section}`,
      empty: 'Create your first section to start your menu.',
      extras: {
        add: '+ Add an add-on',
        legend: 'Add-ons',
        name: (position) => `Add-on ${position} name`,
        price: (position) => `Add-on ${position} price`,
        remove: (position) => `Remove add-on ${position}`,
      },
      layouts: {
        CARDS: {
          description: 'Each dish on its own card, with the photo front and center.',
          label: 'Photo cards',
        },
        LIST: { description: 'Dense rows. Quick to scan, even without photos.', label: 'Compact list' },
      },
      makeAvailable: 'Make available',
      makeAvailableFor: (product) => `Make ${product} available`,
      markUnavailable: 'Mark unavailable',
      markUnavailableFor: (product) => `Mark ${product} unavailable`,
      moveDown: 'Move down',
      moveDownFor: (name) => `Move ${name} down`,
      moveUp: 'Move up',
      moveUpFor: (name) => `Move ${name} up`,
      newSection: '+ New section',
      notices: {
        imageUnidentified: "The product was saved, but we couldn't identify it to process the image.",
        productAvailable: 'Product marked as available in the draft.',
        productCreated: 'Product created in the draft.',
        productDeleted: 'Product removed from the draft.',
        productUnavailable: 'Product marked as unavailable in the draft.',
        productUpdated: 'Product updated in the draft.',
        productsReordered: 'Product order updated in the draft.',
        sectionCreated: 'Section created in the draft.',
        sectionDeleted: 'Section and its products removed from the draft.',
        sectionUpdated: 'Section updated in the draft.',
        sectionsReordered: 'Section order updated in the draft.',
      },
      optionNamePlaceholder: 'Name',
      optionPricePlaceholder: '0.00',
      optionsSummary: (variants, extras) =>
        `${formatCount(variants, 'en', { one: 'variant', other: 'variants' })} · ${formatCount(extras, 'en', { one: 'add-on', other: 'add-ons' })}`,
      product: {
        basePrice: 'Base price (PEN)',
        create: 'Create product',
        description: 'Description',
        image: 'Optional image',
        imageHint: 'JPG, PNG or WebP · 4 MB max',
        imageInput: 'Product image',
        kicker: 'Product details',
        name: 'Name',
        removeImage: 'Remove current image',
        save: 'Save product',
        section: 'Section',
        titleEdit: 'Edit product',
        titleNew: 'New product',
      },
      saving: 'Saving…',
      section: {
        kicker: 'Menu structure',
        layoutLegend: 'How it looks on the menu',
        name: 'Name',
        save: 'Save section',
        titleEdit: 'Edit section',
        titleNew: 'New section',
      },
      sectionEmpty: 'This section has no products yet.',
      summary: (sections, products) =>
        `${formatCount(sections, 'en', { one: 'section', other: 'sections' })} · ${formatCount(products, 'en', { one: 'product', other: 'products' })}`,
      unavailable: 'Unavailable',
      variants: {
        add: '+ Add a variant',
        legend: 'Variants',
        name: (position) => `Variant ${position} name`,
        price: (position) => `Variant ${position} price`,
        remove: (position) => `Remove variant ${position}`,
      },
    },
    publication: {
      confirm: {
        accept: 'Yes, publish menu',
        back: 'Keep reviewing',
        body: 'The previous version will stop showing and this draft becomes your new public menu. The QR link stays the same.',
        kicker: 'Confirm publishing',
        title: 'Update the menu behind your QR code.',
      },
      heading: {
        changes: 'You have changes to publish',
        first: 'Get your first menu ready',
        live: 'Your public menu is up to date',
      },
      kicker: 'Publishing',
      pill: { draft: 'Draft', live: 'Live', unpublished: 'Not published' },
      preview: 'Preview draft',
      previewDialog: {
        close: 'Close preview',
        empty: 'Add an available product to review your menu.',
        eyebrow: 'Digital menu · draft',
        kicker: 'Only you can see this',
        title: 'Draft preview',
      },
      publishChanges: 'Publish changes',
      publishFirst: 'Publish menu',
      publishing: 'Publishing…',
      status: {
        changes: "What your customers see won't change until you confirm publishing.",
        first: 'Your QR code will show “Coming soon” until you publish at least one available product.',
        live: 'Your QR code keeps showing this version, so you can edit with peace of mind.',
      },
      templateLabel: 'Draft template',
      templates: {
        CASUAL: { description: 'Fresh and easy to read on a phone.', label: 'Casual' },
        ORIGINAL: { description: 'A style read from your own menu.', label: 'Original' },
        PREMIUM: { description: 'Dark, warm and understated.', label: 'Premium' },
        TRADITIONAL: { description: 'Classic, like a printed table menu.', label: 'Traditional' },
      },
    },
  },
  es: {
    digitizer: {
      digitize: 'Digitalizar en borrador',
      digitized: 'Carta digitalizada. Revísala y publícala cuando esté lista.',
      digitizing: 'Digitalizando…',
      draft: {
        emptyBody: 'Aquí aparecerá tu carta después de digitalizarla.',
        reviewBody: 'Revisa el resultado antes de actualizar la carta pública.',
        status: {
          changes: 'Hay cambios en borrador. La carta pública conserva su versión anterior.',
          live: 'Esta es la misma versión que está publicada ahora.',
          none: 'Aún no hay una carta publicada. Tu QR mostrará Próximamente.',
        },
        title: 'Tu borrador de carta',
        viewPublished: 'Ver carta publicada ↗',
        viewQrLink: 'Ver enlace del QR ↗',
      },
      kicker: 'Carta del restaurante',
      lede: 'Cada ajuste queda en borrador. Tú decides cuándo actualizar lo que ven tus clientes.',
      loadDraftError: 'No pudimos cargar el borrador de la carta.',
      loadRestaurantsError: 'No pudimos cargar tus restaurantes. Vuelve a intentarlo.',
      loading: 'Cargando carta',
      page: (position) => `Página ${position}`,
      pageAlt: (position, file) => `Página ${position}: ${file}`,
      photos: {
        body: 'Usa buena luz y texto enfocado. Incluye cada página completa.',
        change: 'Cambiar fotografías',
        hint: '1–5 archivos · JPG, PNG o WebP · 3 MB por foto',
        input: 'Fotos de la carta',
        invalid: 'Elige entre 1 y 5 fotos JPG, PNG o WebP; máximo 3 MB cada una y 12 MB en total.',
        select: 'Seleccionar fotografías',
        selected: 'Fotografías seleccionadas',
        title: 'Sube las fotos de tu carta',
      },
      privacy: 'Las fotos se envían a Gemini para interpretarlas y no se almacenan en Sirio.',
      processing: {
        keepOpen: 'No cierres esta ventana. Podrás revisar el borrador al terminar.',
        stages: [
          'Leyendo las páginas de tu carta…',
          'Reconociendo categorías, platos y precios…',
          'Interpretando variantes y adicionales…',
          'Preparando el borrador para tu revisión…',
        ],
        title: 'Gemini está interpretando tu carta',
      },
      published: 'La carta pública se actualizó. El QR sigue siendo el mismo.',
      templateApplied: 'Plantilla aplicada al borrador. Publícala cuando estés conforme.',
      title: 'Prepara la próxima versión de tu carta.',
    },
    manager: {
      actions: 'Acciones ⌄',
      actionsFor: (name) => `Acciones de ${name}`,
      addProductTo: (section) => `Añadir producto a ${section}`,
      cancel: 'Cancelar',
      confirmDeleteProduct: (product) => `¿Eliminar “${product}” permanentemente?`,
      confirmDeleteSection: (section) =>
        `¿Eliminar “${section}” y todos sus productos permanentemente?`,
      delete: 'Eliminar',
      deleteFor: (product) => `Eliminar ${product}`,
      deleteSectionFor: (section) => `Eliminar sección ${section}`,
      edit: 'Editar',
      editFor: (name) => `Editar ${name}`,
      editSectionFor: (section) => `Editar sección ${section}`,
      empty: 'Crea la primera sección para empezar tu carta.',
      extras: {
        add: '+ Añadir adicionales',
        legend: 'Adicionales',
        name: (position) => `Adicionales ${position} nombre`,
        price: (position) => `Adicionales ${position} precio`,
        remove: (position) => `Quitar adicionales ${position}`,
      },
      layouts: {
        CARDS: {
          description: 'Cada plato en su tarjeta, con la foto como protagonista.',
          label: 'Tarjetas con foto',
        },
        LIST: {
          description: 'Filas densas. Se recorre rápido, aunque falten fotos.',
          label: 'Lista compacta',
        },
      },
      makeAvailable: 'Hacer disponible',
      makeAvailableFor: (product) => `Hacer disponible ${product}`,
      markUnavailable: 'Marcar no disponible',
      markUnavailableFor: (product) => `Marcar no disponible ${product}`,
      moveDown: 'Bajar',
      moveDownFor: (name) => `Bajar ${name}`,
      moveUp: 'Subir',
      moveUpFor: (name) => `Subir ${name}`,
      newSection: '+ Nueva sección',
      notices: {
        imageUnidentified:
          'El producto se guardó, pero no pudimos identificarlo para procesar la imagen.',
        productAvailable: 'Producto marcado como disponible en el borrador.',
        productCreated: 'Producto creado en el borrador.',
        productDeleted: 'Producto eliminado del borrador.',
        productUnavailable: 'Producto marcado como no disponible en el borrador.',
        productUpdated: 'Producto actualizado en el borrador.',
        productsReordered: 'Orden de productos actualizado en el borrador.',
        sectionCreated: 'Sección creada en el borrador.',
        sectionDeleted: 'Sección y productos eliminados del borrador.',
        sectionUpdated: 'Sección actualizada en el borrador.',
        sectionsReordered: 'Orden de secciones actualizado en el borrador.',
      },
      optionNamePlaceholder: 'Nombre',
      optionPricePlaceholder: 'S/ 0.00',
      optionsSummary: (variants, extras) =>
        `${formatCount(variants, 'es', { one: 'variante', other: 'variantes' })} · ${formatCount(extras, 'es', { one: 'adicional', other: 'adicionales' })}`,
      product: {
        basePrice: 'Precio base (S/)',
        create: 'Crear producto',
        description: 'Descripción',
        image: 'Imagen opcional',
        imageHint: 'JPG, PNG o WebP · máximo 4 MB',
        imageInput: 'Imagen del producto',
        kicker: 'Ficha de producto',
        name: 'Nombre',
        removeImage: 'Quitar imagen actual',
        save: 'Guardar producto',
        section: 'Sección',
        titleEdit: 'Editar producto',
        titleNew: 'Nuevo producto',
      },
      saving: 'Guardando…',
      section: {
        kicker: 'Estructura de la carta',
        layoutLegend: 'Cómo se ve en la carta',
        name: 'Nombre',
        save: 'Guardar sección',
        titleEdit: 'Editar sección',
        titleNew: 'Nueva sección',
      },
      sectionEmpty: 'Esta sección aún no tiene productos.',
      summary: (sections, products) =>
        `${formatCount(sections, 'es', { one: 'sección', other: 'secciones' })} · ${formatCount(products, 'es', { one: 'producto', other: 'productos' })}`,
      unavailable: 'No disponible',
      variants: {
        add: '+ Añadir variantes',
        legend: 'Variantes',
        name: (position) => `Variantes ${position} nombre`,
        price: (position) => `Variantes ${position} precio`,
        remove: (position) => `Quitar variantes ${position}`,
      },
    },
    publication: {
      confirm: {
        accept: 'Sí, publicar carta',
        back: 'Volver a revisar',
        body: 'La versión anterior dejará de mostrarse y este borrador será la nueva carta pública. El enlace del QR no cambia.',
        kicker: 'Confirmar publicación',
        title: 'Actualiza la carta que ve tu QR.',
      },
      heading: {
        changes: 'Tienes cambios por publicar',
        first: 'Prepara la primera carta',
        live: 'La carta pública está al día',
      },
      kicker: 'Orden de publicación',
      pill: { draft: 'Borrador', live: 'En vivo', unpublished: 'Sin publicar' },
      preview: 'Previsualizar borrador',
      previewDialog: {
        close: 'Cerrar previsualización',
        empty: 'Agrega un producto disponible para revisar tu carta.',
        eyebrow: 'Carta digital · borrador',
        kicker: 'Solo tú ves esto',
        title: 'Previsualización del borrador',
      },
      publishChanges: 'Publicar cambios',
      publishFirst: 'Publicar carta',
      publishing: 'Publicando…',
      status: {
        changes: 'La versión que ven tus clientes no cambia hasta que confirmes la publicación.',
        first: 'Tu QR mostrará “Próximamente” hasta que publiques al menos un producto disponible.',
        live: 'Tu QR sigue mostrando esta versión. Puedes editar con tranquilidad.',
      },
      templateLabel: 'Plantilla del borrador',
      templates: {
        CASUAL: { description: 'Fresco y muy legible en celular.', label: 'Casual' },
        ORIGINAL: { description: 'Estilo interpretado desde tu carta.', label: 'Original' },
        PREMIUM: { description: 'Oscuro, cálido y más sobrio.', label: 'Premium' },
        TRADITIONAL: { description: 'Clásico, como una carta de mesa.', label: 'Tradicional' },
      },
    },
  },
};
