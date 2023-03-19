<script>
  import { hash } from '../services/route.serv'
  import { blockMain } from '../stores.js';
  import Homepage from '../pages/Homepage.svelte';
  import Donators from '../pages/Donators.svelte';
  import Card from '../pages/Card.svelte';
  import Notfound from '../pages/Notfound.svelte';

  let value = Notfound;

  hash.subscribe( valu => {
    blockMain.update(v => false);
    switch(valu) {
      case '':
        blockMain.update(v => true);
        value = Homepage;
        break;
      case 'donators':
        value = Donators;
        break;
      case 'card':
        value = Card;
        break;
      default:
        value = Notfound;
    }
  });
</script>

<main>
  <svelte:component this={value}/>
</main>
