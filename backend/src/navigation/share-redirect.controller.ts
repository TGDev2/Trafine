import { Controller, Get, Param, Redirect, HttpStatus } from '@nestjs/common';

/**
 * Alias vers l’endpoint officiel `/navigation/share/:id`.
 * Accepte *à la fois* `/share/:id` et `//share/:id` pour tolérer
 * les QR-codes comportant un double slash après le domaine.
 */
@Controller()
export class ShareRedirectController {
  // tableau de routes → un seul handler
  @Get(['/share/:id', '//share/:id'])
  @Redirect(undefined, HttpStatus.FOUND)   // 302
  redirect(@Param('id') id: string) {
    return { url: `/navigation/share/${id}` };
  }
}
