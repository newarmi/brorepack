/** Сохраняет Blob как файл через временную ссылку */
export const saveBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/** Blob → base64 без префикса `data:…;base64,` */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // readAsDataURL всегда отдаёт строку вида data:<тип>;base64,<данные>
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Не получилось прочитать файл'));
    reader.readAsDataURL(blob);
  });
};
