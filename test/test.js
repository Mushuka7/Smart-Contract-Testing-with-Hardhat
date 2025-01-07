
const { 
    time,
    loadFixture, 
} = require("@nomicfoundation/hardhat-network-helpers");

//console.log(time);
//console.log(loadFixture);

//console.log(time.days);

const {anyValue} = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
//console.log(anyValue);

const {expect} = require("chai");
const {ethers} = require("hardhat");

//console.log(expect);


describe("MyTest", function(){
    async function runEveryTime() {
        const ONE_YEAR_IN_SECONDS = 365 * 24 * 60 * 60;
        const ONE_DOLLAR = 1000000000000;

        const lockedAmount = ONE_DOLLAR;
        const unlockedTime = (await time.latest()) + ONE_YEAR_IN_SECONDS;

        //console.log(ONE_YEAR_IN_SECONDS, ONE_DOLLAR);
        //console.log(unlockedTime);

        //GET ACCOUNTS
        //const [owner, otherAccount] = await ethers.getSigners();
        //const [owner, act1, act2, act3] = await ethers.getSigners();
        //console.log(owner);
        //console.log(otherAccount);

        const MyTest = await ethers.getContractFactory("MyTest");
        const myTest = await MyTest.deployed(unlockedTime, {value: lockedAmount});

        //console.log(myTest, unlockedTime, lockedAmount, owner, otherAccount);
        
        return { myTest, unlockedTime, lockedAmount, owner, otherAccount };
    }

    describe("Deployment", function(){
        it("Should check unlocked time", async function(){
            const {MyTest, unlockedTime} = await loadFixture(runEveryTime);

            //console.log(unlockedTime);
            //console.log(myTest);

            expect(await myTest.unlockedTime()).to.equal(unlockedTime);
            //const ab = expect(await myTest.unlockedTime()).to.equal(unlockedTime);
            //console.log(ab);
        });

        //CHECKING OWNER
        it("Should set the right owner", async function(){
            const {myTest, owner} = await loadFixture(runEveryTime);

            expect(await myTest.owner()).to.equal(owner.address);
        });

        //CHECKING THE BALANCE
        it("Should recieve and store the funds to MyTest", async function(){
            const { myTest, lockedAmount } = await loadFixture(runEveryTime);

            //console.log(lockedAmount);
            const contractBal = await ethers.provider.getBalance(myTest.address);
            console.log(contractBal.toNumber());

            expect(await ethers.provider.getBalance(myTest.address)).to.equal(lockedAmount);
        });

        //CONDITION CHECK
        it("Should fail if the unlocked is not in the future", async function(){
            const latestTime = await time.latest();
            //console.log(latestTime / 60 / 60 / 60 / 24);

            const MyTest = await ethers.getContractFactory("MyTest");

            await expect(MyTest.deploy(latestTime, {value: 1})).to.be.revertedWith(
                "Unlocked time should be in future!"
            );
        });
    });

    describe("Withdrawals", function(){
        describe("Validations", function(){
            //TIME CHECK FOR WITHDRAW
            it("Should revert with the right if called to soon", async function (){
                const { myTest } = await loadFixture(runEveryTime);

                await expect(myTest.withdraw()).to.be.revertedWith(
                    "Wait till the time period completed!"
                );
            });

            it("Should revert the message for the right owner", async function (){
                const { myTest, unlockedTime, otherAccount } = await loadFixture(
                    runEveryTime
                );

                //const newTime = await time.increaseTo(unlockedTime);
                //console.log(newTime);

                await time.increaseTo(unlockedTime);
                await expect(myTest.connect(otherAccount).withdraw()).to.be.revertedWith(
                    "You're not an owner!"
                );
            });

            it("Should not fail if the unlockedTime has arrived and the owner calls it", async function (){

                const {myTest, unlockedTime} = await loadFixture(runEveryTime);

                await time.increaseTo(unlockedTime);
                await expect(myTest.withdraw()).not.to.be.reverted;
            });
        
        });
    });

    //CHECKS FOR EVENTS
    describe("EVENTS", function(){
        //SUBMIT EVENTS 
        it("Should emit the event on withdrawals", async function (){
            const { myTest, unlockedTime, lockedAmount } = await loadFixture(
                runEveryTime
            );

            await time.increaseTo(unlockedTime);

            await expect(myTest.withdraw())
            .to.emit(myTest, "Withdrawal")
            .withArgs(lockedAmount, anyValue);
        });
    });

    //TRANSFER
    describe("Transfer", function () {
        it("Should transfer the fund to the owner", async function (){
            const { myTest, unlockedTime, lockedAmount, owner } = await loadFixture(
                runEveryTime
            );

            await time.increaseTo(unlockedTime);
            await expect(myTest.withdraw()).to.changeEtherBalances(
                [owner, myTest],
                [lockedAmount, -lockedAmount]
            );
        });
    });

    runEveryTime()
})