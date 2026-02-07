import { registerPlugin } from '@capacitor/core';

export interface FileSaverPlugin {
    saveFile(options: { base64Data: string; filename: string; contentType?: string }): Promise<{ uri: string }>;
}

const FileSaver = registerPlugin<FileSaverPlugin>('FileSaver');

export default FileSaver;
