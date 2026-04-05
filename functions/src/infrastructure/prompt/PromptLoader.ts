import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

const GITHUB_REPO = 'kakeru-ikeda/link-like-essentials-functions';
const GITHUB_FILE_PATH = 'functions/prompts/card-filter-query.txt';
const LOCAL_PROMPT_PATH = path.resolve(
  __dirname,
  '../../../prompts/card-filter-query.txt'
);

/**
 * プロンプトファイルをロードするクラス。
 * エミュレータ環境ではローカルファイルを直読みし、
 * 本番環境では GitHub Contents API 経由で取得する。
 * キャッシュ機構あり（インスタンス単位）。
 */
export class PromptLoader {
  private cache: string | undefined;

  async load(): Promise<string | undefined> {
    if (this.cache !== undefined) {
      return this.cache;
    }

    const isEmulator = process.env['FUNCTIONS_EMULATOR'] === 'true';

    if (isEmulator) {
      return this.loadFromLocal();
    } else {
      return this.loadFromGitHub();
    }
  }

  private loadFromLocal(): string | undefined {
    try {
      const content = fs.readFileSync(LOCAL_PROMPT_PATH, 'utf-8');
      this.cache = content;
      return content;
    } catch (err) {
      console.warn('[PromptLoader] ローカルプロンプトファイルの読み込みに失敗しました:', err);
      return undefined;
    }
  }

  private loadFromGitHub(): Promise<string | undefined> {
    const pat = process.env['GITHUB_PAT'];
    if (!pat) {
      console.warn('[PromptLoader] GITHUB_PAT が設定されていません。デフォルトプロンプトを使用します。');
      return Promise.resolve(undefined);
    }

    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

    return new Promise((resolve) => {
      const req = https.get(
        url,
        {
          headers: {
            Authorization: `Bearer ${pat}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'lles-functions-prompt-loader',
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk: Buffer) => {
            body += chunk.toString();
          });
          res.on('end', () => {
            try {
              const json = JSON.parse(body) as { content?: string };
              if (!json.content) {
                console.warn('[PromptLoader] GitHub API レスポンスに content フィールドがありません。レスポンス:', body.slice(0, 200));
                resolve(undefined);
                return;
              }
              // GitHub API の content フィールドは Base64 エンコードされている（改行あり）
              const decoded = Buffer.from(json.content.replace(/\n/g, ''), 'base64').toString('utf-8');
              this.cache = decoded;
              resolve(decoded);
            } catch (err) {
              console.warn('[PromptLoader] GitHub API レスポンスの解析に失敗しました:', err);
              resolve(undefined);
            }
          });
        }
      );
      req.on('error', (err) => {
        console.warn('[PromptLoader] GitHub API へのリクエストが失敗しました:', err);
        resolve(undefined);
      });
    });
  }
}
