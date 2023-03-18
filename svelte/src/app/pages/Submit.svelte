<script>
    let form = {
        name: '',
        email: '',
        phone: '',
        sum: 0
    };

    async function submitForm() {
        const res = await fetch(`api/v1/donator`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(form)
        });
        if (!res.ok)
            throw await res.json();
    }

    let promise;
    let show = false;

    function submit() {
        show = true;
        promise = submitForm();
    }
</script>

<div class="card">
  <h5 class="card-header">Отправить деняк</h5>
  <div class="card-body">
    <form>  
        <div class="form-group">
            <label>ФИО</label>
            <input type="text" class="form-control" bind:value={form.name} />
        </div>
        <div class="form-group">
            <label>Электронная почта</label>
            <input type="email" class="form-control" bind:value={form.email} />
        </div>
        <div class="form-group">
            <label>Номер телефона</label>
            <input type="tel" class="form-control" bind:value={form.phone} />
        </div>
        <div class="form-group">
            <label>Сумма пожертвования</label>
            <input type="number" class="form-control" bind:value={form.sum} />
        </div>

        <button on:click={submit} class="btn btn-primary mt-3">Отправить</button>
    </form>
    {#if show}
        {#await promise}
            <div class="spinner-border mt-3" role="status"></div>
        {:then}
            <small class="form-text text-success">Успешно отправлено</small>
        {:catch error}
            <small class="form-text text-danger">{error.message}</small>
        {/await}
    {/if}
  </div>
</div>

