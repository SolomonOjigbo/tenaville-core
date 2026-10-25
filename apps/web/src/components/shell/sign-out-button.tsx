import { Button } from '../ui/button';

/**
 * Sign out (ORG-9).
 *
 * A form posting to the route handler rather than a link: a GET would let any
 * page sign a user out with an image tag, and being signed out mid-task is a
 * real nuisance for an agent recording a payment on site.
 */
export const SignOutButton = () => (
  <form action="/auth/sign-out" method="post">
    <Button type="submit" variant="ghost" size="sm">
      Sign out
    </Button>
  </form>
);
