import { Readable } from 'node:stream'
import * as tar from 'tar'

/** Parse a .gapp image tar into a path → bytes map. */
export async function parseTarBytes(
  tarBytes: Buffer
): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>()

  await new Promise<void>((resolve, reject) => {
    const parser = new tar.Parser({
      onReadEntry(entry) {
        if (entry.type !== 'File') {
          entry.resume()
          return
        }

        const chunks: Buffer[] = []
        entry.on('data', (chunk: Buffer) => chunks.push(chunk))
        entry.on('end', () => {
          files.set(entry.path, Buffer.concat(chunks))
        })
      },
    })
    parser.on('end', () => resolve())
    parser.on('error', reject)
    Readable.from(tarBytes).pipe(parser)
  })

  return files
}
