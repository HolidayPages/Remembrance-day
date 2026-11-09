(() => {
    const apiUrl = document.querySelector('meta[name="poppy-api-url"]').content.trim().replace(/\/+$/, "");
    const addButton = document.getElementById("open-dedication");
    const dialog = document.getElementById("dedication-dialog");
    const form = document.getElementById("dedication-form");
    const nameInput = document.getElementById("veteran-name");
    const errorMessage = document.getElementById("form-error");
    const submitButton = document.getElementById("submit-dedication");
    const closeButton = document.getElementById("close-dialog");
    const cancelButton = document.getElementById("cancel-dedication");
    const field = document.getElementById("field");
    const emptyState = document.getElementById("empty-state");
    const fieldCount = document.getElementById("field-count");
    const connectionStatus = document.getElementById("connection-status");
    const toast = document.getElementById("toast");
    const names = new Set();
    let toastTimer;

    const normalizeName = (name) => name.normalize("NFC").trim().replace(/\s+/gu, " ");
    const comparisonName = (name) => normalizeName(name).toLowerCase();

    const validateName = (rawName) => {
        const name = normalizeName(rawName);

        if (!name) {
            return { error: "Please enter a veteran's name." };
        }

        if ([...name].length > 80) {
            return { error: "Names must be 80 characters or fewer." };
        }

        if (/\p{Cc}/u.test(name)) {
            return { error: "Please remove control characters from the name." };
        }

        if (/[<>]/u.test(name)) {
            return { error: "Please enter a name without markup or angle brackets." };
        }

        if (names.has(comparisonName(name))) {
            return { error: "A poppy has already been dedicated to this name." };
        }

        return { name };
    };

    const setConnectionStatus = (message, isError = false) => {
        connectionStatus.textContent = message;
        connectionStatus.classList.toggle("is-error", isError);
    };

    const showError = (message) => {
        errorMessage.textContent = message;
        nameInput.setAttribute("aria-invalid", "true");
    };

    const clearError = () => {
        errorMessage.textContent = "";
        nameInput.removeAttribute("aria-invalid");
    };

    const makePoppy = (name) => {
        const button = document.createElement("button");
        const flower = document.createElement("span");
        const leaf = document.createElement("span");
        const tooltip = document.createElement("span");
        const tooltipId = `poppy-name-${field.querySelectorAll(".poppy").length + 1}`;

        button.className = "poppy";
        button.type = "button";
        button.setAttribute("aria-label", `Poppy dedicated to ${name}`);
        button.setAttribute("aria-describedby", tooltipId);
        button.title = name;

        flower.className = "poppy-flower";
        flower.setAttribute("aria-hidden", "true");
        leaf.className = "poppy-leaf";
        leaf.setAttribute("aria-hidden", "true");
        tooltip.className = "poppy-tooltip";
        tooltip.id = tooltipId;
        tooltip.setAttribute("role", "tooltip");
        tooltip.textContent = name;

        button.append(flower, leaf, tooltip);
        return button;
    };

    const updateField = () => {
        const count = names.size;
        emptyState.hidden = count > 0;
        fieldCount.textContent = count === 1 ? "1 name remembered" : `${count} names remembered`;
    };

    const addPoppy = (name) => {
        names.add(comparisonName(name));
        field.insertBefore(makePoppy(name), emptyState);
        updateField();
    };

    const setSubmitting = (isSubmitting) => {
        submitButton.disabled = isSubmitting;
        submitButton.textContent = isSubmitting ? "Planting…" : "Plant this poppy";
    };

    const showToast = (name) => {
        window.clearTimeout(toastTimer);
        toast.textContent = `You have planted a poppy for ${name}`;
        toast.classList.add("is-visible");
        toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 5000);
    };

    const fetchJson = async (url, options) => {
        let response;
        try {
            response = await fetch(url, options);
        } catch {
            throw new Error("The shared poppy field could not be reached. Please try again later.");
        }

        let data;
        try {
            data = await response.json();
        } catch {
            throw new Error("The shared poppy service returned an unreadable response.");
        }

        if (!response.ok) {
            throw new Error(data.error || "The poppy service could not complete the request.");
        }

        return data;
    };

    const closeDialog = () => {
        if (dialog.open) {
            dialog.close();
        }
    };

    addButton.addEventListener("click", () => {
        clearError();
        nameInput.value = "";
        dialog.showModal();
        nameInput.focus();
    });

    closeButton.addEventListener("click", closeDialog);
    cancelButton.addEventListener("click", closeDialog);
    nameInput.addEventListener("input", clearError);

    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
            closeDialog();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearError();

        const validation = validateName(nameInput.value);
        if (validation.error) {
            showError(validation.error);
            nameInput.focus();
            return;
        }

        setSubmitting(true);
        try {
            const result = await fetchJson(`${apiUrl}/poppies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: validation.name })
            });

            if (!result.poppy || typeof result.poppy.name !== "string") {
                throw new Error("The poppy service returned an invalid dedication.");
            }

            const plantedName = normalizeName(result.poppy.name);
            addPoppy(plantedName);
            closeDialog();
            showToast(plantedName);
            addButton.focus();
        } catch (error) {
            showError(error instanceof Error ? error.message : "The dedication could not be submitted.");
        } finally {
            setSubmitting(false);
        }
    });

    if (!apiUrl) {
        emptyState.hidden = false;
        field.setAttribute("aria-busy", "false");
        fieldCount.textContent = "Shared field not configured";
        setConnectionStatus("The shared field is not connected yet. Set the API URL in this page's configuration after deploying the API.", true);
        return;
    }

    fetchJson(`${apiUrl}/poppies`)
        .then((result) => {
            if (!Array.isArray(result.poppies)) {
                throw new Error("The poppy service returned an invalid field.");
            }

            result.poppies.forEach((poppy) => {
                if (poppy && typeof poppy.name === "string") {
                    const name = normalizeName(poppy.name);
                    if (name && !names.has(comparisonName(name))) {
                        addPoppy(name);
                    }
                }
            });

            updateField();
            setConnectionStatus("Connected to the shared poppy field.");
            addButton.disabled = false;
        })
        .catch((error) => {
            emptyState.hidden = true;
            fieldCount.textContent = "Field unavailable";
            setConnectionStatus(`${error.message} Dedications are unavailable until the service is restored.`, true);
        })
        .finally(() => field.setAttribute("aria-busy", "false"));
})();
