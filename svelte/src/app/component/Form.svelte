<script>
  export let form = {
    name: "",
    email: "",
    phone: "",
    level: 0,
  };

  async function submitForm() {
    const res = await fetch(`api/v1/donator`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });
    if (!res.ok) throw await res.json();
  }

  let promise;
  let show = false;

  function handleSubmit() {
    show = true;
    promise = submitForm();
  }
  
</script>

<div class="mx-auto col-8 d-flex justify-content-center align-items-center">
  <p class="section-title text-center">Стать меценатом</p>
</div>

<div class="card col-6 my-5 mx-auto" style="background-color: #e5eff3;">
  <div class="card-body">
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group mb-3">
        <label class="form-label">ФИО</label>
        <input type="text" class="form-control rounded-pill" bind:value={form.name} />
      </div>
      <div class="form-group mb-3">
        <label class="form-label">Электронная почта</label>
        <input type="email" class="form-control rounded-pill" bind:value={form.email} />
      </div>
      <div class="form-group mb-3">
        <label class="form-label">Номер телефона</label>
        <input type="tel" class="form-control rounded-pill" bind:value={form.phone} />
      </div>
      <div class="form-group mb-3">
        <label class="form-label">Выберите уровень подписки</label>
        <select bind:value={form.level}
          class="custom-select rounded-pill" id="form-select"
        >
          <option selected="selected" value="1" style="color: #C07825">BRONZE</option>
          <option value="2" style="color: #667581">SILVER</option>
          <option value="3" style="color: #D7B642">GOLD</option>
        </select>
      </div>

      <button disabled={form.level == 0 || !form.name || !form.phone || !form.email} type="submit" class="btn btn-primary mt-3">Отправить</button>
    </form>
    {#if show}
      {#await promise}
        <div class="spinner-border mt-3" role="status" />
      {:then}
        <small class="form-text text-success">Успешно отправлено</small>
      {:catch error}
        <small class="form-text text-danger">{error.message}</small>
      {/await}
    {/if}
  </div>
</div>
